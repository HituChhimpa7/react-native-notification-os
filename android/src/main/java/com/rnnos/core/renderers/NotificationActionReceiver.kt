package com.rnnos.core.renderers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import com.rnnos.core.engines.ChatEngine

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val actionId = intent.getStringExtra("actionId")
        val threadId = intent.getStringExtra("threadId")
        val notificationId = intent.getStringExtra("notificationId")

        if ("com.rnnos.ACTION_INLINE_REPLY" == intent.action) {
            val remoteInputResults = RemoteInput.getResultsFromIntent(intent)
            if (remoteInputResults != null) {
                val replyText = remoteInputResults.getCharSequence(NotificationRenderer.KEY_TEXT_REPLY)?.toString()

                if (!replyText.isNullOrEmpty() && !threadId.isNullOrEmpty()) {
                    // Update Kotlin Chat Engine state natively
                    ChatEngine.appendUserReply(context, threadId, replyText)
                    // Notify React Native JS layer
                    com.rnnos.RNNOSTurboModule.sendInlineReplyEvent(threadId, replyText)
                }
            }
        } else if ("com.rnnos.ACTION_BUTTON_CLICK" == intent.action) {
            if (!actionId.isNullOrEmpty()) {
                if (actionId.contains("read") && !threadId.isNullOrEmpty()) {
                    ChatEngine.markThreadAsRead(context, threadId)
                }
                if (!notificationId.isNullOrEmpty()) {
                    com.rnnos.RNNOSTurboModule.sendNotificationTappedEvent(notificationId, actionId)
                }
            }
        }
    }
}
