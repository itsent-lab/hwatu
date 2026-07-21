import XCTest
@testable import FamilyHwatu

final class NativeAudioContractTests: XCTestCase {
    func testRequiredLicenseDocumentsAreBundled() {
        XCTAssertNotNil(Bundle.module.url(forResource: "LICENSE", withExtension: nil, subdirectory: "legal"))
        XCTAssertNotNil(Bundle.module.url(forResource: "THIRD_PARTY_NOTICES", withExtension: "md", subdirectory: "legal"))
        XCTAssertNotNil(Bundle.module.url(forResource: "Apache-2.0", withExtension: "txt", subdirectory: "legal/licenses"))
        XCTAssertNotNil(Bundle.module.url(forResource: "BigScience-OpenRAIL-M", withExtension: "txt", subdirectory: "legal/licenses"))
    }

    @MainActor
    func testGookjinDoublePeeTakesPriorityOverGenericBonusAudio() {
        let plan = NativeGameSound.noticePlan("국진을 쌍피로 변경", player: .human)
        XCTAssertEqual(plan.effect, .gookjinDouble)
        XCTAssertEqual(plan.voice, "gookjin-double")
        XCTAssertEqual(plan.voiceDelayMilliseconds, 100)
    }

    @MainActor
    func testVoiceDelaysAndMusicStagesMatchWebContract() {
        XCTAssertTrue(NativeAudioDefaults.soundEnabled)
        XCTAssertTrue(NativeAudioDefaults.voiceEnabled)
        XCTAssertFalse(NativeAudioDefaults.backgroundMusicEnabled)
        XCTAssertEqual(NativeAudioDefaults.volume, 0.28)
        XCTAssertEqual(NativeGameSound.noticePlan("보너스 쌍피", player: .human).voiceDelayMilliseconds, 150)
        XCTAssertEqual(NativeGameSound.noticePlan("흔들기!", player: .human).voiceDelayMilliseconds, 140)
        XCTAssertEqual(NativeGameSound.noticePlan("흔들기!", player: .computer).voiceDelayMilliseconds, 170)
        XCTAssertEqual(NativeGameSound.MusicStage.game(score: 0, goCount: 0, ended: false), .calm)
        XCTAssertEqual(NativeGameSound.MusicStage.game(score: 5, goCount: 0, ended: false), .tense)
        XCTAssertEqual(NativeGameSound.MusicStage.game(score: 10, goCount: 0, ended: false), .climax)
        XCTAssertEqual(NativeGameSound.MusicStage.game(score: 0, goCount: 0, ended: true), .result)
        XCTAssertEqual(NativeGameSound.MusicStage.climax.playbackRate, 1.095, accuracy: 0.0001)
        XCTAssertEqual(NativeGameSound.MusicStage.climax.gain, 0.162, accuracy: 0.0001)
    }
}
