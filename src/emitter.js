
function emit_statements(statements,emit_function) {
    let statement_array = new Array();
    for (let s_i = 0; s_i < statements.childCount; s_i++) {
      let statement = statements.child(s_i);
      //let line_number = parseInt(statement.startPosition.row);
      statement_array += emit_function(statement);
    }
}