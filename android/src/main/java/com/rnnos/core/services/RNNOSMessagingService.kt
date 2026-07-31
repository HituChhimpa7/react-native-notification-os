package com.rnnos.core.services

import android.content.Intent
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.rnnos.RNNOSTurboModule
import com.rnnos.core.domain.model.NormalizedNotification
import com.rnnos.core.domain.model.NotificationType
import com.rnnos.core.engines.ChatEngine
import com.rnnos.core.engines.CommerceEngine
import com.rnnos.core.renderers.NotificationRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class RNNOSMessagingService : FirebaseMessagingService() {

    // ─────────────────────────────────────────────────────────────────────────
    // handleIntent() — FCM calls this FIRST, before showing any system banner.
    //
    // This override gives RNNOS full control in ALL app states:
    //
    //  Case 1: data only           → super.handleIntent() → onMessageReceived() ✅
    //  Case 2: notification only   → we intercept → RNNOS custom banner ✅
    //  Case 3: notification + data → we intercept → RNNOS custom banner (data priority) ✅
    //
    // By NOT calling super.handleIntent() when we handle the notification,
    // we suppress the generic system banner entirely.
    // ─────────────────────────────────────────────────────────────────────────
    override fun handleIntent(intent: Intent?) {
        try {
            val bundle = intent?.extras ?: run { super.handleIntent(intent); return }

            // FCM puts notification key fields under these bundle keys
            val notifTitle = bundle.getString("gcm.notification.title")
                ?: bundle.getString("google.c.a.c_l")
            val notifBody = bundle.getString("gcm.notification.body")
            val notifChannelId = bundle.getString("gcm.notification.android_channel_id")
                ?: "rnnos_default_channel"

            // Collect data keys (exclude internal FCM/Google keys)
            val dataMap = mutableMapOf<String, String>()
            bundle.keySet().forEach { key ->
                if (!key.startsWith("gcm.") &&
                    !key.startsWith("google.") &&
                    key != "from" &&
                    key != "collapse_key"
                ) {
                    bundle.getString(key)?.let { dataMap[key] = it }
                }
            }

            val hasData = dataMap.isNotEmpty()
            val hasNotif = notifTitle != null || notifBody != null

            when {
                // ── Case 2 & 3: notification key present (alone OR with data)
                // Intercept → suppress system banner → render RNNOS banner
                hasNotif -> {
                    if (!dataMap.containsKey("title") && notifTitle != null)
                        dataMap["title"] = notifTitle
                    if (!dataMap.containsKey("body") && notifBody != null)
                        dataMap["body"] = notifBody
                    if (!dataMap.containsKey("category"))
                        dataMap["category"] = notifChannelId
                    if (!dataMap.containsKey("id"))
                        dataMap["id"] = "fcm_${System.currentTimeMillis()}"
                    if (!dataMap.containsKey("messageId"))
                        dataMap["messageId"] = dataMap["id"]!!

                    renderFromMap(dataMap)
                    // ← DO NOT call super.handleIntent() → system banner suppressed ✅
                }

                // ── Case 1: data only → pass to normal FCM pipeline → onMessageReceived()
                hasData -> super.handleIntent(intent)

                // ── Empty → pass through
                else -> super.handleIntent(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            super.handleIntent(intent) // safe fallback
        }
    }

    // Handles data-only payloads (Case 1) — called by super.handleIntent()
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        try {
            if (remoteMessage.data.isNotEmpty()) {
                val jsonMap = remoteMessage.data.toMutableMap()

                // Fallback: use notification fields if data is missing them
                remoteMessage.notification?.title?.let {
                    if (!jsonMap.containsKey("title")) jsonMap["title"] = it
                }
                remoteMessage.notification?.body?.let {
                    if (!jsonMap.containsKey("body")) jsonMap["body"] = it
                }

                renderFromMap(jsonMap)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // ── Shared rendering pipeline ─────────────────────────────────────────────
    private fun renderFromMap(dataMap: Map<String, String>) {
        try {
            val jsonStr = JSONObject(dataMap as Map<*, *>).toString()
            val notification = NormalizedNotification.fromJsonString(jsonStr) ?: return

            when (notification.type) {
                NotificationType.CHAT -> {
                    ChatEngine.processChatMessage(applicationContext, notification)
                }
                NotificationType.COMMERCE -> {
                    CommerceEngine.updateOrderProgress(applicationContext, notification)
                }
                else -> {
                    CoroutineScope(Dispatchers.IO).launch {
                        NotificationRenderer.render(
                            applicationContext,
                            notification,
                            isSilentUpdate = notification.silentUpdate
                        )
                    }
                }
            }

            // Emit to React Native JS layer (effective in foreground)
            RNNOSTurboModule.sendNotificationReceivedEvent(notification)

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        RNNOSTurboModule.sendTokenRefreshEvent(token)
    }
}
