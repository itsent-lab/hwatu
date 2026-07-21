import Foundation
import XCTest
@testable import FamilyHwatu

final class APIClientIntegrationTests: XCTestCase {
    @MainActor
    func testServerAddressValidation() throws {
        XCTAssertEqual(try AppState.normalizedServerURL(" https://example.com/ "), "https://example.com")
        XCTAssertEqual(try AppState.normalizedServerURL("http://127.0.0.1:5233"), "http://127.0.0.1:5233")
        XCTAssertEqual(try AppState.normalizedServerURL("http://hwatu.nsrnb.localhost:8080"), "http://hwatu.nsrnb.localhost:8080")
        XCTAssertThrowsError(try AppState.normalizedServerURL("http://example.com"))
        XCTAssertThrowsError(try AppState.normalizedServerURL("https://example.com/api"))
    }

    func testMacClientCompatibilityWithRunningServer() async throws {
        guard let serverURL = ProcessInfo.processInfo.environment["FAMILY_HWATU_TEST_API_URL"],
              let endpoint = URL(string: serverURL) else {
            throw XCTSkip("FAMILY_HWATU_TEST_API_URL이 설정된 통합 테스트에서 실행합니다.")
        }

        let client = APIClient(baseURLProvider: { endpoint })
        let status = try await client.clientStatus()

        XCTAssertEqual(status.apiVersion, 1)
        XCTAssertEqual(status.client, APIClient.clientName)
        XCTAssertEqual(status.clientVersion, APIClient.clientVersion)
        XCTAssertTrue(status.compatible)
        XCTAssertEqual(status.authentication, "cookie-csrf")
    }

    @MainActor
    func testAppConnectsThroughExistingNginxAPI() async throws {
        guard let serverURL = ProcessInfo.processInfo.environment["FAMILY_HWATU_TEST_LEGACY_API_URL"] else {
            throw XCTSkip("FAMILY_HWATU_TEST_LEGACY_API_URL이 설정된 통합 테스트에서 실행합니다.")
        }

        let appState = AppState()
        let previousURL = appState.serverURLText
        defer { try? appState.setServerURL(previousURL) }
        try appState.setServerURL(serverURL)

        let message = try await appState.testServerConnection()

        XCTAssertTrue(message.contains("성공"))
        await appState.launch()
        XCTAssertNil(appState.errorMessage)
    }
}
