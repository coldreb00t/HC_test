import SwiftUI
import WebKit
import Photos

// Класс для обработки сообщений от JavaScript
class WebViewMessageHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else {
            return
        }
        
        switch action {
        case "saveImage":
            if let imageBase64 = dict["image"] as? String,
               let filename = dict["filename"] as? String {
                saveImageToPhotos(imageBase64: imageBase64, filename: filename)
            }
        default:
            print("Неизвестное действие: \(action)")
        }
    }
    
    // Функция для сохранения изображения в галерею
    func saveImageToPhotos(imageBase64: String, filename: String) {
        guard let imageData = Data(base64Encoded: imageBase64),
              let image = UIImage(data: imageData) else {
            print("Не удалось декодировать изображение")
            return
        }
        
        // Запрашиваем разрешение на доступ к фотогалерее
        PHPhotoLibrary.requestAuthorization { status in
            if status == .authorized {
                PHPhotoLibrary.shared().performChanges({
                    PHAssetCreationRequest.forAsset().addResource(with: .photo, data: imageData, options: nil)
                }) { success, error in
                    if success {
                        print("Изображение успешно сохранено в галерею")
                        
                        // Уведомляем пользователя через UI
                        DispatchQueue.main.async {
                            self.showAlert(title: "Успешно", message: "Изображение сохранено в галерею")
                        }
                    } else if let error = error {
                        print("Ошибка при сохранении изображения: \(error)")
                        DispatchQueue.main.async {
                            self.showAlert(title: "Ошибка", message: "Не удалось сохранить изображение: \(error.localizedDescription)")
                        }
                    }
                }
            } else {
                print("Нет разрешения на доступ к фотогалерее")
                DispatchQueue.main.async {
                    self.showAlert(title: "Нет доступа", message: "Разрешите доступ к фотогалерее в настройках")
                }
            }
        }
    }
    
    // Вспомогательная функция для показа алертов
    func showAlert(title: String, message: String) {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            rootViewController.present(alert, animated: true)
        }
    }
}

// Обёртка для WKWebView, чтобы использовать его в SwiftUI
struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        // Настройка конфигурации WKWebView
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        // Добавляем обработчик сообщений от JavaScript
        let messageHandler = WebViewMessageHandler()
        config.userContentController.add(messageHandler, name: "shareHandler")
        
        // Создаем WKWebView с настроенной конфигурацией
        let webView = WKWebView(frame: .zero, configuration: config)
        
        // Разрешаем открытие ссылок в Safari
        webView.allowsLinkPreview = true
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        uiView.load(request)
    }
}

// Основной интерфейс в ContentView
struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://coldreb00t-hc-test-05b6.twc1.net")!)
            .frame(maxWidth: .infinity, maxHeight: .infinity) // Растягивает WebView на весь экран
            .edgesIgnoringSafeArea(.all)
            .onAppear {
                // Запрашиваем разрешения при запуске приложения
                requestPermissions()
            }
    }
    
    // Функция для запроса необходимых разрешений
    func requestPermissions() {
        // Запрос разрешения на доступ к фотогалерее
        PHPhotoLibrary.requestAuthorization { status in
            print("Статус разрешения на доступ к фотогалерее: \(status.rawValue)")
        }
    }
}

// Для предпросмотра в XCode
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
} 