import XCTest
import SwiftTreeSitter
import TreeSitterAda

final class TreeSitterAdaTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_ada())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Ada grammar for tree-sitter grammar")
    }
}
