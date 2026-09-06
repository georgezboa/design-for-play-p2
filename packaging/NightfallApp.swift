import AppKit
import WebKit

final class NightfallDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var serverProcess: Process?
    private let port = 41730

    private var appRoot: URL {
        Bundle.main.bundleURL.appendingPathComponent("Contents")
    }

    private var gameURL: URL {
        URL(string: "http://127.0.0.1:\(port)/")!
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        createWindow()
        startGameServerIfNeeded()
    }

    private func createWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsAirPlayForMediaPlayback = false
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.allowsMagnification = false
        webView.setValue(false, forKey: "drawsBackground")

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let frame = NSRect(
            x: screen.midX - min(1440, screen.width) / 2,
            y: screen.midY - min(900, screen.height) / 2,
            width: min(1440, screen.width),
            height: min(900, screen.height)
        )
        window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "NIGHTFALL"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.backgroundColor = .black
        window.contentView = webView
        window.collectionBehavior = [.fullScreenPrimary]
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func startGameServerIfNeeded() {
        probeServer { [weak self] ready in
            guard let self else { return }
            if ready {
                self.loadGame()
                return
            }
            self.launchServer()
        }
    }

    private func launchServer() {
        let nodeCandidates = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"]
        guard let node = nodeCandidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            showFatal("Node.js is required to run this local build.")
            return
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: node)
        process.arguments = [
            appRoot.appendingPathComponent("Resources/nightfall-local-server.mjs").path,
            appRoot.appendingPathComponent("Resources/game").path,
            String(port),
        ]
        let log = FileHandle(forWritingAtPath: "/tmp/nightfall-local.log")
        process.standardOutput = log
        process.standardError = log
        do {
            try process.run()
            serverProcess = process
            waitForServer(attempt: 0)
        } catch {
            showFatal("The local game service could not start: \(error.localizedDescription)")
        }
    }

    private func waitForServer(attempt: Int) {
        probeServer { [weak self] ready in
            guard let self else { return }
            if ready {
                self.loadGame()
            } else if attempt < 60 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    self.waitForServer(attempt: attempt + 1)
                }
            } else {
                self.showFatal("The local game service did not become ready.")
            }
        }
    }

    private func probeServer(completion: @escaping (Bool) -> Void) {
        var request = URLRequest(url: gameURL)
        request.timeoutInterval = 0.5
        URLSession.shared.dataTask(with: request) { _, response, _ in
            let ready = (response as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async { completion(ready) }
        }.resume()
    }

    private func loadGame() {
        webView.load(URLRequest(url: gameURL, cachePolicy: .reloadIgnoringLocalCacheData))
        window.makeFirstResponder(webView)
    }

    private func showFatal(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "NIGHTFALL could not start"
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.runModal()
        NSApp.terminate(nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        serverProcess?.terminate()
    }
}

let application = NSApplication.shared
let delegate = NightfallDelegate()
application.delegate = delegate
application.run()
