import Foundation
import XCTest
@testable import FamilyHwatu

final class SecureCookieStoreTests: XCTestCase {
    func testPersistentCookiesAreScopedRestoredAndClearedThroughVault() throws {
        let vault = MemoryCookieVault()
        let store = SecureCookieStore(vault: vault)
        let url = try XCTUnwrap(URL(string: "https://example.com/api/session"))
        let response = try XCTUnwrap(HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: ["Set-Cookie": "hwatu_auth=secret; Path=/api; Expires=Wed, 21 Jul 2038 10:00:00 GMT; Secure; HttpOnly"]
        ))
        store.consume(response: response, for: url)
        XCTAssertNotNil(vault.data)

        let restored = SecureCookieStore(vault: vault)
        XCTAssertEqual(restored.requestHeader(for: url), "hwatu_auth=secret")
        XCTAssertNil(restored.requestHeader(for: URL(string: "https://other.example/api/session")!))
        XCTAssertNil(restored.requestHeader(for: URL(string: "http://example.com/api/session")!))
        XCTAssertNil(restored.requestHeader(for: URL(string: "https://example.com/outside")!))

        restored.clear()
        XCTAssertNil(vault.data)
        XCTAssertNil(restored.requestHeader(for: url))
    }
}

private final class MemoryCookieVault: CookieVault {
    var data: Data?
    func load() throws -> Data? { data }
    func save(_ data: Data) throws { self.data = data }
    func clear() throws { data = nil }
}
