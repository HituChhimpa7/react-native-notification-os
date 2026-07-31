package com.rnnos.core.renderers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.app.RemoteInput
import com.rnnos.core.domain.model.NormalizedNotification
import com.rnnos.core.domain.model.NotificationType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL

object NotificationRenderer {

    const val KEY_TEXT_REPLY = "key_text_reply"
    const val DEFAULT_CHANNEL_ID = "rnnos_default_channel"
    const val DEFAULT_CHANNEL_NAME = "General Notifications"

    fun ensureChannel(context: Context, channelId: String?, channelName: String?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val id = channelId ?: DEFAULT_CHANNEL_ID
            val name = channelName ?: DEFAULT_CHANNEL_NAME
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(id) == null) {
                val channel = NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "RNNOS Managed Channel"
                    enableVibration(true)
                    enableLights(true)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    suspend fun render(context: Context, notification: NormalizedNotification, isSilentUpdate: Boolean = false) {
        withContext(Dispatchers.IO) {
            val channelId = notification.category ?: DEFAULT_CHANNEL_ID
            ensureChannel(context, channelId, "Default Channel")

            val notificationManager = NotificationManagerCompat.from(context)
            val builder = NotificationCompat.Builder(context, channelId)
                .setContentTitle(notification.title)
                .setContentText(notification.body)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVibrate(longArrayOf(0, 250, 250, 250))
                .setOnlyAlertOnce(isSilentUpdate)
                .setAutoCancel(true)

            notification.subtitle?.let { builder.setSubText(it) }

            // Content Intent for Tap Action & Auto-Dismiss
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("notification_id", notification.id)
                putExtra("thread_id", notification.threadId)
                putExtra("deep_link", notification.deepLink)
            }
            if (launchIntent != null) {
                val contentPendingIntent = PendingIntent.getActivity(
                    context,
                    notification.id.hashCode(),
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                )
                builder.setContentIntent(contentPendingIntent)
            }

            // Handle Type-Specific Rendering
            when (notification.type) {
                NotificationType.CHAT -> renderChatStyle(context, builder, notification)
                NotificationType.COMMERCE -> renderCommerceStyle(context, builder, notification)
                NotificationType.MEDIA, NotificationType.GENERIC, NotificationType.PROGRESS -> {
                    if (!notification.imageUrl.isNullOrEmpty()) {
                        val bitmap = downloadBitmap(notification.imageUrl)
                        if (bitmap != null) {
                            builder.setStyle(NotificationCompat.BigPictureStyle().bigPicture(bitmap).setSummaryText(notification.body))
                            builder.setLargeIcon(bitmap)
                        }
                    }
                }
            }

            // Attach Action Buttons
            notification.actions.forEach { action ->
                if (action.type == "TEXT_INPUT") {
                    val remoteInput = RemoteInput.Builder(KEY_TEXT_REPLY)
                        .setLabel(action.placeholder ?: "Reply...")
                        .build()

                    val replyIntent = Intent(context, NotificationActionReceiver::class.java).apply {
                        setAction("com.rnnos.ACTION_INLINE_REPLY")
                        putExtra("notificationId", notification.id)
                        putExtra("threadId", notification.threadId)
                        putExtra("actionId", action.id)
                    }

                    val replyPendingIntent = PendingIntent.getBroadcast(
                        context,
                        notification.id.hashCode() + action.id.hashCode(),
                        replyIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                    )

                    val actionObj = NotificationCompat.Action.Builder(
                        android.R.drawable.ic_menu_send,
                        action.title,
                        replyPendingIntent
                    ).addRemoteInput(remoteInput).build()

                    builder.addAction(actionObj)
                } else {
                    // Standard BUTTON or DESTRUCTIVE action button (e.g. Mark Read, Accept, Reject)
                    val buttonIntent = Intent(context, NotificationActionReceiver::class.java).apply {
                        setAction("com.rnnos.ACTION_BUTTON_CLICK")
                        putExtra("notificationId", notification.id)
                        putExtra("threadId", notification.threadId)
                        putExtra("actionId", action.id)
                    }

                    val buttonPendingIntent = PendingIntent.getBroadcast(
                        context,
                        notification.id.hashCode() + action.id.hashCode(),
                        buttonIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                    )

                    val iconRes = if (action.id.contains("read")) {
                        android.R.drawable.checkbox_on_background
                    } else if (action.id.contains("accept")) {
                        android.R.drawable.ic_input_add
                    } else if (action.id.contains("reject")) {
                        android.R.drawable.ic_delete
                    } else {
                        android.R.drawable.ic_menu_info_details
                    }

                    val actionObj = NotificationCompat.Action.Builder(
                        iconRes,
                        action.title,
                        buttonPendingIntent
                    ).build()

                    builder.addAction(actionObj)
                }
            }

            val targetId = if (notification.type == NotificationType.CHAT && !notification.threadId.isNullOrEmpty()) notification.threadId!! else notification.id
            val notificationIdInt = targetId.hashCode()
            try {
                notificationManager.notify(notificationIdInt, builder.build())
            } catch (e: SecurityException) {
                // Permission not granted or notification error
                e.printStackTrace()
            }
        }
    }

    private fun renderChatStyle(
        context: Context,
        builder: NotificationCompat.Builder,
        notification: NormalizedNotification
    ) {
        val chatMeta = notification.chatMetadata
        val userPerson = Person.Builder().setName("Me").setKey("user_me").build()
        val messagingStyle = NotificationCompat.MessagingStyle(userPerson)

        if (chatMeta != null && chatMeta.isGroup && !chatMeta.groupName.isNullOrEmpty()) {
            messagingStyle.conversationTitle = chatMeta.groupName
            messagingStyle.isGroupConversation = true
        }

        val lastMsg = chatMeta?.messages?.lastOrNull()
        if (lastMsg != null) {
            val sender = Person.Builder()
                .setName(lastMsg.senderName)
                .setKey(lastMsg.senderId)
                .build()
            messagingStyle.addMessage(lastMsg.text, lastMsg.timestamp, sender)
            builder.setContentText(lastMsg.text)
        } else {
            builder.setContentText(notification.body)
        }

        builder.setStyle(messagingStyle)
    }

    private fun renderCommerceStyle(
        context: Context,
        builder: NotificationCompat.Builder,
        notification: NormalizedNotification
    ) {
        val commerce = notification.commerceMetadata ?: return
        val accentColorStr = notification.color ?: "#22C55E"
        try {
            builder.setColor(android.graphics.Color.parseColor(accentColorStr))
            builder.setColorized(true)
        } catch (e: Exception) {
            builder.setColor(android.graphics.Color.parseColor("#22C55E"))
        }

        val isDarkMode = (context.resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES

        if (notification.useCustomLayout) {
            val layoutId = context.resources.getIdentifier("rnnos_custom_notification", "layout", context.packageName)
            if (layoutId != 0) {
                val remoteViews = android.widget.RemoteViews(context.packageName, layoutId)
                val containerId = context.resources.getIdentifier("notif_container", "id", context.packageName)
                val titleId = context.resources.getIdentifier("notif_title", "id", context.packageName)
                val bodyId = context.resources.getIdentifier("notif_body", "id", context.packageName)
                val etaId = context.resources.getIdentifier("notif_eta", "id", context.packageName)
                val progressId = context.resources.getIdentifier("notif_progress", "id", context.packageName)

                val bgDrawableName = if (isDarkMode) "rnnos_gradient_dark" else "rnnos_gradient_light"
                val bgDrawableId = context.resources.getIdentifier(bgDrawableName, "drawable", context.packageName)
                if (containerId != 0 && bgDrawableId != 0) {
                    remoteViews.setInt(containerId, "setBackgroundResource", bgDrawableId)
                }

                if (titleId != 0) remoteViews.setTextViewText(titleId, notification.title)
                if (bodyId != 0) remoteViews.setTextViewText(bodyId, notification.body)
                if (etaId != 0) remoteViews.setTextViewText(etaId, commerce.estimatedDelivery ?: "")
                if (progressId != 0) remoteViews.setProgressBar(progressId, 100, commerce.progressPercent, false)

                builder.setCustomContentView(remoteViews)
                builder.setCustomBigContentView(remoteViews)
                builder.setStyle(NotificationCompat.DecoratedCustomViewStyle())
                return
            }
        }

        builder.setProgress(100, commerce.progressPercent, false)
        val status = commerce.statusText ?: "Step ${commerce.currentStep} of ${commerce.totalSteps}: ${commerce.stepName}"
        builder.setContentText(status)
        commerce.estimatedDelivery?.let {
            builder.setSubText("ETA: $it")
        }
    }

    private fun downloadBitmap(urlStr: String): Bitmap? {
        return try {
            val url = URL(urlStr)
            val connection = url.openConnection()
            connection.doInput = true
            connection.connect()
            val input = connection.getInputStream()
            BitmapFactory.decodeStream(input)
        } catch (e: Exception) {
            null
        }
    }

    private fun getPriorityInt(priority: com.rnnos.core.domain.model.NotificationPriority): Int {
        return when (priority) {
            com.rnnos.core.domain.model.NotificationPriority.MIN -> NotificationCompat.PRIORITY_MIN
            com.rnnos.core.domain.model.NotificationPriority.LOW -> NotificationCompat.PRIORITY_LOW
            com.rnnos.core.domain.model.NotificationPriority.DEFAULT -> NotificationCompat.PRIORITY_DEFAULT
            com.rnnos.core.domain.model.NotificationPriority.HIGH -> NotificationCompat.PRIORITY_HIGH
            com.rnnos.core.domain.model.NotificationPriority.MAX -> NotificationCompat.PRIORITY_MAX
        }
    }
}
