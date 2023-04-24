
function emit_statements(tree, emit_function) {
    const declarations =
      tree.rootNode.childCount > 1 ? tree.rootNode.child(0) : [];
    const statements =
      tree.rootNode.childCount > 1
        ? tree.rootNode.child(1)
        : tree.rootNode.child(0);

    let source_code = new Array();
    for (let d_i = 0; d_i < declarations.childCount; d_i++) {
      source_code += declarations.child(d_i).text;
      // TODO: emit declartions
    }

    for (let s_i = 0; s_i < statements.childCount; s_i++) {
      let statement = statements.child(s_i);
      //let line_number = parseInt(statement.startPosition.row);
      source_code += emit_function(statement);
    }
    return source_code;
}