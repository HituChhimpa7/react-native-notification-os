package com.rnnos

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.rnnos.core.data.cache.DuplicateDetector
import com.rnnos.core.domain.model.NormalizedNotification
import com.rnnos.core.engines.ChatEngine
import com.rnnos.core.engines.CommerceEngine
import com.rnnos.core.renderers.NotificationRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray

class RNNOSTurboModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    override fun getName(): String = "RNNOSTurboModule"

    companion object {
        private var instance: RNNOSTurboModule? = null

        fun sendInlineReplyEvent(threadId: String, replyText: String) {
            try {
                val params = Arguments.createMap().apply {
                    putString("threadId", threadId)
                    putString("replyText", replyText)
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_InlineReply", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun sendNotificationTappedEvent(notificationId: String, actionId: String?) {
            try {
                val params = Arguments.createMap().apply {
                    putString("notificationId", notificationId)
                    actionId?.let { putString("actionId", it) }
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_ActionTapped", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun sendTokenRefreshEvent(token: String) {
            try {
                val params = Arguments.createMap().apply {
                    putString("token", token)
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_FCMTokenRefresh", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun sendNotificationReceivedEvent(notification: NormalizedNotification) {
            try {
                val params = Arguments.createMap().apply {
                    putString("id", notification.id)
                    putString("title", notification.title)
                    putString("body", notification.body)
                    putString("type", notification.type.name)
                    notification.category?.let { putString("category", it) }
                    notification.deepLink?.let { putString("deepLink", it) }
                }
                instance?.reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("RNNOS_NotificationReceived", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun initialize(configJson: String, promise: Promise) {
        try {
            NotificationRenderer.ensureChannel(reactContext, null, null)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkPermissionStatus(promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                val granted = androidx.core.content.ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                promise.resolve(if (granted) "GRANTED" else "DENIED")
            } else {
                val enabled = androidx.core.app.NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
                promise.resolve(if (enabled) "GRANTED" else "DENIED")
            }
        } catch (e: Exception) {
            promise.resolve("DENIED")
        }
    }

    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = android.content.Intent().apply {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    action = android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS
                    putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
                } else {
                    action = "android.settings.APP_NOTIFICATION_SETTINGS"
                    putExtra("app_package", reactContext.packageName)
                    putExtra("app_uid", reactContext.applicationInfo.uid)
                }
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestNotificationPermission(promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                val granted = androidx.core.content.ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED

                if (!granted && currentActivity != null) {
                    androidx.core.app.ActivityCompat.requestPermissions(
                        currentActivity!!,
                        arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                        1001
                    )
                }
                promise.resolve(granted)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun getFCMToken(promise: Promise) {
        try {
            if (com.google.firebase.FirebaseApp.getApps(reactContext).isEmpty()) {
                // Firebase is not configured in host app - fallback safely without crash
                promise.resolve("")
                return
            }
            com.google.firebase.messaging.FirebaseMessaging.getInstance().token
                .addOnCompleteListener { task ->
                    if (task.isSuccessful && task.result != null) {
                        promise.resolve(task.result)
                    } else {
                        promise.resolve("")
                    }
                }
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun presentNotification(notificationJson: String, promise: Promise) {
        try {
            val notification = NormalizedNotification.fromJsonString(notificationJson)
            
            // Check for duplicate
            if (DuplicateDetector.isDuplicate(notification)) {
                promise.resolve(false)
                return
            }

            when (notification.type) {
                com.rnnos.core.domain.model.NotificationType.CHAT -> {
                    ChatEngine.processChatMessage(reactContext, notification)
                }
                com.rnnos.core.domain.model.NotificationType.COMMERCE -> {
                    CommerceEngine.updateOrderProgress(reactContext, notification)
                }
                else -> {
                    CoroutineScope(Dispatchers.IO).launch {
                        NotificationRenderer.render(reactContext, notification, isSilentUpdate = false)
                    }
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PRESENT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissNotification(id: String, promise: Promise) {
        try {
            val manager = androidx.core.app.NotificationManagerCompat.from(reactContext)
            manager.cancel(id.hashCode())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISMISS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissAllNotifications(promise: Promise) {
        try {
            val manager = androidx.core.app.NotificationManagerCompat.from(reactContext)
            manager.cancelAll()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISMISS_ALL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getDeliveredNotifications(promise: Promise) {
        promise.resolve(JSONArray().toString())
    }

    @ReactMethod
    fun createChannel(channelJson: String, promise: Promise) {
        try {
            val json = org.json.JSONObject(channelJson)
            val id = json.getString("id")
            val name = json.getString("name")
            NotificationRenderer.ensureChannel(reactContext, id, name)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CHANNEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setBadgeCount(count: Int, promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun getBadgeCount(promise: Promise) {
        promise.resolve(0)
    }

    @ReactMethod
    fun getNotificationHistory(limit: Int, offset: Int, promise: Promise) {
        promise.resolve(JSONArray().toString())
    }

    @ReactMethod
    fun clearNotificationHistory(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Handled by RN Event Emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Handled by RN Event Emitter
    }
}
