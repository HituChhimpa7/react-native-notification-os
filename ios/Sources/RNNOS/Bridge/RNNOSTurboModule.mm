#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import "rnnos-Swift.h"

@interface RNNOSTurboModule : RCTEventEmitter <RCTBridgeModule>
@end

@implementation RNNOSTurboModule

RCT_EXPORT_MODULE(RNNOSTurboModule)

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onNotificationReceived", @"onNotificationTapped", @"onInlineReply"];
}

RCT_EXPORT_METHOD(initialize:(NSString *)configJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] requestPermissions:^(BOOL granted) {
        resolve(@(granted));
    }];
}

RCT_EXPORT_METHOD(checkPermissionStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[UNUserNotificationCenter currentNotificationCenter] getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
        if (settings.authorizationStatus == UNAuthorizationStatusAuthorized) {
            resolve(@"GRANTED");
        } else if (settings.authorizationStatus == UNAuthorizationStatusDenied) {
            resolve(@"DENIED");
        } else {
            resolve(@"NOT_DETERMINED");
        }
    }];
}

RCT_EXPORT_METHOD(openNotificationSettings:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSURL *url = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
        if ([[UIApplication sharedApplication] canOpenURL:url]) {
            [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:^(BOOL success) {
                resolve(@(success));
            }];
        } else {
            resolve(@(NO));
        }
    });
}

RCT_EXPORT_METHOD(requestNotificationPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[NotificationRenderer shared] requestPermissions:^(BOOL granted) {
        resolve(@(granted));
    }];
}

RCT_EXPORT_METHOD(getFCMToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@"");
}

RCT_EXPORT_METHOD(presentNotification:(NSString *)notificationJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NormalizedNotification *notification = [NormalizedNotification parseWithJsonString:notificationJson];
    if (!notification) {
        reject(@"PARSE_ERROR", @"Invalid Notification JSON payload", nil);
        return;
    }

    if ([[DuplicateDetector shared] isDuplicateWithNotification:notification]) {
        resolve(@(NO));
        return;
    }

    [[NotificationRenderer shared] renderWithNotification:notification completion:^(BOOL success) {
        resolve(@(success));
    }];
}

RCT_EXPORT_METHOD(dismissNotification:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[UNUserNotificationCenter currentNotificationCenter] removeDeliveredNotificationsWithIdentifiers:@[notificationId]];
    resolve(@(YES));
}

RCT_EXPORT_METHOD(dismissAllNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[UNUserNotificationCenter currentNotificationCenter] removeAllDeliveredNotifications];
    resolve(@(YES));
}

RCT_EXPORT_METHOD(setBadgeCount:(double)count
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [UIApplication sharedApplication].applicationIconBadgeNumber = (NSInteger)count;
        resolve(@(YES));
    });
}

RCT_EXPORT_METHOD(getBadgeCount:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSInteger badge = [UIApplication sharedApplication].applicationIconBadgeNumber;
        resolve(@(badge));
    });
}

RCT_EXPORT_METHOD(getDeliveredNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@"[]");
}

RCT_EXPORT_METHOD(createChannel:(NSString *)channelJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(YES));
}

RCT_EXPORT_METHOD(getNotificationHistory:(double)limit
                  offset:(double)offset
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@"[]");
}

RCT_EXPORT_METHOD(clearNotificationHistory:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(YES));
}

@end
