import Foundation
import UserNotifications

@objc public final class NotificationRenderer: NSObject {
    @objc public static let shared = NotificationRenderer()

    private override init() {
        super.init()
    }

    public func requestPermissions(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            completion(granted)
        }
    }

    public func render(notification: NormalizedNotification, completion: ((Bool) -> Void)? = nil) {
        let content = UNMutableNotificationContent()
        content.title = notification.title
        content.body = notification.body
        if let subtitle = notification.subtitle {
            content.subtitle = subtitle
        }
        if let badge = notification.badge {
            content.badge = NSNumber(value: badge)
        }
        if let soundName = notification.sound, !soundName.isEmpty {
            content.sound = UNNotificationSound(named: UNNotificationSoundName(rawValue: soundName))
        } else {
            content.sound = .default
        }
        if let threadId = notification.threadId {
            content.threadIdentifier = threadId
        }
        if let category = notification.category {
            content.categoryIdentifier = category
        }

        content.userInfo = notification.data

        // Handle Image Attachment
        if let imageUrlStr = notification.imageUrl, let url = URL(string: imageUrlStr) {
            downloadImage(url: url) { localUrl in
                if let localUrl = localUrl, let attachment = try? UNNotificationAttachment(identifier: "image", url: localUrl, options: nil) {
                    content.attachments = [attachment]
                }
                self.postNotificationRequest(id: notification.id, content: content, completion: completion)
            }
        } else {
            self.postNotificationRequest(id: notification.id, content: content, completion: completion)
        }
    }

    private func postNotificationRequest(id: String, content: UNMutableNotificationContent, completion: ((Bool) -> Void)?) {
        let request = UNNotificationRequest(identifier: id, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[RNNOS] iOS Notification Post Error: \(error.localizedDescription)")
                completion?(false)
            } else {
                completion?(true)
            }
        }
    }

    private func downloadImage(url: URL, completion: @escaping (URL?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { location, response, error in
            guard let location = location, error == nil else {
                completion(nil)
                return
            }
            let tmpDirectory = FileManager.default.temporaryDirectory
            let targetUrl = tmpDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
            do {
                try FileManager.default.moveItem(at: location, to: targetUrl)
                completion(targetUrl)
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }
}
