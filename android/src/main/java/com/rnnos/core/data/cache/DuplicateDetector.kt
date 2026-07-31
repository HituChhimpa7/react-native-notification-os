package com.rnnos.core.data.cache

import android.util.LruCache
import com.rnnos.core.domain.model.NormalizedNotification

object DuplicateDetector {
    private const val MAX_CACHE_SIZE = 500
    private const val DEFAULT_TTL_MS = 60000L // 60 seconds deduplication window

    private val seenMessageIds = LruCache<String, Long>(MAX_CACHE_SIZE)
    private val seenCollapseKeys = LruCache<String, String>(MAX_CACHE_SIZE) // Key -> Notification ID

    @Synchronized
    fun isDuplicate(notification: NormalizedNotification): Boolean {
        val now = System.currentTimeMillis()

        // 1. Check exact MessageId
        val prevTimestamp = seenMessageIds.get(notification.messageId)
        if (prevTimestamp != null && (now - prevTimestamp) < DEFAULT_TTL_MS) {
            return true
        }

        // Record messageId timestamp
        seenMessageIds.put(notification.messageId, now)
        return false
    }

    @Synchronized
    fun getExistingNotificationIdForCollapseKey(collapseKey: String?): String? {
        if (collapseKey.isNull_or_Empty()) return null
        return seenCollapseKeys.get(collapseKey)
    }

    @Synchronized
    fun recordCollapseKey(collapseKey: String?, notificationId: String) {
        if (!collapseKey.isNull_or_Empty()) {
            seenCollapseKeys.put(collapseKey, notificationId)
        }
    }

    private fun String?.isNull_or_Empty(): Boolean = this == null || this.trim().isEmpty()
}
