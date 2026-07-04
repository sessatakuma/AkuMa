import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image("Logo")
                .resizable()
                .frame(width: 64, height: 64)
                .accessibilityHidden(true)

            Text("AkuMa")
                .font(.system(size: 28, weight: .bold, design: .default))
                .foregroundStyle(.white)

            Text("Japanese Pitch Accent & Furigana Tool")
                .font(.system(size: 16, weight: .medium, design: .default))
                .foregroundStyle(.white.opacity(0.88))
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.38, green: 0.62, blue: 0.51))
    }
}
