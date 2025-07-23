package tree_sitter_ada_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_ada "github.com/briot/tree-sitter-ada/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_ada.Language())
	if language == nil {
		t.Errorf("Error loading Ada grammar for tree-sitter grammar")
	}
}
