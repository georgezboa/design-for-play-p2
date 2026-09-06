#import <AppKit/AppKit.h>
#import <WebKit/WebKit.h>

@interface NightfallDelegate : NSObject <NSApplicationDelegate, WKNavigationDelegate>
@property NSWindow *window;
@property WKWebView *webView;
@property NSTask *serverTask;
@end

@implementation NightfallDelegate

- (NSURL *)gameURL {
    return [NSURL URLWithString:@"http://127.0.0.1:41730/"];
}

- (NSURL *)contentsURL {
    return [NSBundle.mainBundle.bundleURL URLByAppendingPathComponent:@"Contents"];
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];

    WKWebViewConfiguration *configuration = [WKWebViewConfiguration new];
    configuration.allowsAirPlayForMediaPlayback = NO;
    configuration.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;
    self.webView = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:configuration];
    self.webView.navigationDelegate = self;
    self.webView.allowsMagnification = NO;
    [self.webView setValue:@NO forKey:@"drawsBackground"];

    NSRect visible = NSScreen.mainScreen.visibleFrame;
    CGFloat width = MIN(1440.0, visible.size.width);
    CGFloat height = MIN(900.0, visible.size.height);
    NSRect frame = NSMakeRect(NSMidX(visible) - width / 2, NSMidY(visible) - height / 2, width, height);
    self.window = [[NSWindow alloc]
        initWithContentRect:frame
        styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable | NSWindowStyleMaskFullSizeContentView
        backing:NSBackingStoreBuffered
        defer:NO];
    self.window.title = @"NIGHTFALL";
    self.window.titleVisibility = NSWindowTitleHidden;
    self.window.titlebarAppearsTransparent = YES;
    self.window.backgroundColor = NSColor.blackColor;
    self.window.contentView = self.webView;
    self.window.collectionBehavior = NSWindowCollectionBehaviorFullScreenPrimary;
    [self.window center];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];

    [self probeServer:^(BOOL ready) {
        if (ready) [self loadGame];
        else [self launchServer];
    }];
}

- (void)probeServer:(void (^)(BOOL))completion {
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:self.gameURL];
    request.timeoutInterval = 0.5;
    [[[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        BOOL ready = [(NSHTTPURLResponse *)response statusCode] == 200;
        dispatch_async(dispatch_get_main_queue(), ^{ completion(ready); });
    }] resume];
}

- (void)launchServer {
    NSString *bundledNode = [[[self.contentsURL URLByAppendingPathComponent:@"Resources/runtime"] URLByAppendingPathComponent:@"node"] path];
    NSArray<NSString *> *candidates = @[bundledNode, @"/opt/homebrew/bin/node", @"/usr/local/bin/node", @"/usr/bin/node"];
    NSString *node = nil;
    for (NSString *candidate in candidates) {
        if ([NSFileManager.defaultManager isExecutableFileAtPath:candidate]) { node = candidate; break; }
    }
    if (!node) { [self showFatal:@"The bundled NIGHTFALL runtime is missing."]; return; }

    NSURL *contents = self.contentsURL;
    self.serverTask = [NSTask new];
    self.serverTask.executableURL = [NSURL fileURLWithPath:node];
    self.serverTask.arguments = @[
        [[contents URLByAppendingPathComponent:@"Resources/nightfall-local-server.mjs"] path],
        [[contents URLByAppendingPathComponent:@"Resources/game"] path],
        @"41730"
    ];
    NSFileHandle *log = [NSFileHandle fileHandleForWritingAtPath:@"/tmp/nightfall-local.log"];
    self.serverTask.standardOutput = log;
    self.serverTask.standardError = log;
    NSError *error = nil;
    if (![self.serverTask launchAndReturnError:&error]) {
        [self showFatal:[NSString stringWithFormat:@"The local game service could not start: %@", error.localizedDescription]];
        return;
    }
    [self waitForServer:0];
}

- (void)waitForServer:(NSInteger)attempt {
    [self probeServer:^(BOOL ready) {
        if (ready) { [self loadGame]; return; }
        if (attempt >= 60) { [self showFatal:@"The local game service did not become ready."]; return; }
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 100 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
            [self waitForServer:attempt + 1];
        });
    }];
}

- (void)loadGame {
    NSURLRequest *request = [NSURLRequest requestWithURL:self.gameURL cachePolicy:NSURLRequestReloadIgnoringLocalCacheData timeoutInterval:10];
    [self.webView loadRequest:request];
    [self.window makeFirstResponder:self.webView];
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    if (![NSProcessInfo.processInfo.environment[@"NIGHTFALL_MEDIA_SMOKE"] isEqualToString:@"1"]) return;
    NSString *script = @"window.__nightfallSmoke=document.createElement('video'); window.__nightfallSmoke.src='/cinematics/start.mp4'; window.__nightfallSmoke.volume=0; document.body.append(window.__nightfallSmoke); window.__nightfallSmoke.play(); true";
    [webView evaluateJavaScript:script completionHandler:^(id result, NSError *error) {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
            [webView evaluateJavaScript:@"JSON.stringify({paused:window.__nightfallSmoke.paused,currentTime:window.__nightfallSmoke.currentTime,readyState:window.__nightfallSmoke.readyState,error:window.__nightfallSmoke.error&&window.__nightfallSmoke.error.message})" completionHandler:^(id state, NSError *stateError) {
                NSString *output = stateError ? stateError.localizedDescription : [state description];
                [output writeToFile:@"/tmp/nightfall-media-smoke.json" atomically:YES encoding:NSUTF8StringEncoding error:nil];
                [NSApp terminate:nil];
            }];
        });
    }];
}

- (void)showFatal:(NSString *)message {
    NSAlert *alert = [NSAlert new];
    alert.messageText = @"NIGHTFALL could not start";
    alert.informativeText = message;
    alert.alertStyle = NSAlertStyleCritical;
    [alert runModal];
    [NSApp terminate:nil];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender { return YES; }

- (void)applicationWillTerminate:(NSNotification *)notification {
    if (self.serverTask.running) [self.serverTask terminate];
}

@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *application = NSApplication.sharedApplication;
        NightfallDelegate *delegate = [NightfallDelegate new];
        application.delegate = delegate;
        [application run];
    }
    return 0;
}
