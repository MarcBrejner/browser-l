function get_reader_type(reader) {
  if (reader.child(0).type == "assign" || reader.child(0).type == "datavar") {
    return reader.child(0).child(0).type;
  } else {
    return reader.child(0).type;
  }
}

function compile_reader(reader_node) {
  let reader_id = reader_node.text;
  let reader_type = get_reader_type(reader_node);
  switch (reader_type) {
    case "register":
      return new reader(RT.REGISTER, reader_id);
    case "memory":
      return new reader(RT.MEMORY, reader_id);
    case "constant":
      return new reader(RT.CONSTANT, reader_id);
    case "data":
      return new reader(RT.DATA, reader_id);
    case "label":
      return new reader(RT.LABEL, reader_id);
    case "number":
      //the number that the reader holds, is the id in this case
      return new reader(RT.NUMBER, parseInt(reader_id));
  }
}

function compile_writer(statement) {
  let writer_node = statement.child(0).child(0).child(0);
  let writer_id = writer_node.text;
  switch (writer_node.type) {
    case "memory":
      return new writer(WT.MEMORY, writer_id);
    case "register":
      return new writer(WT.REGISTER, writer_id);
  }
}

function compile_assign(statement) {
  var writer = compile_writer(statement);
  var assign_type = statement.child(1).text;
  var expression = statement.child(2);
  var numOfChildren = expression.childCount;
  var is_conditional = assign_type === "?=" ? true : false;

  switch (numOfChildren) {
    case 1: // reader
      var reader = compile_reader(expression.child(0));
      return [
        new bytecode(OP.ASSIGN, [is_conditional, writer, reader])].concat(get_ecs_for_statement(statement));
    case 2: // oper, reader
      var reader = compile_reader(expression.child(1));
      var opr = expression.child(0).text;
      return [new bytecode(OP.ASSIGN_UN, [is_conditional, writer, opr, reader])].concat(get_ecs_for_statement(statement));
    case 3: // reader, oper, reader
      var reader1 = compile_reader(expression.child(0));
      var opr = expression.child(1).text;
      var reader2 = compile_reader(expression.child(2));
      return [new bytecode(OP.ASSIGN_BIN, [is_conditional, writer, reader1, opr, reader2,])].concat(get_ecs_for_statement(statement));
  }
}

function compile_statement(statement) {
  if (statement.childCount == 1 && statement.text == "syscall") {
    return [new bytecode(OP.SYSCALL)].concat(get_ecs_for_statement(statement));;
  } else {
    return compile_assign(statement);
  }
}

function compile_program(statements, declarations) {
  let [constants, data] = compile_declarations(declarations);
  let [instructions, ecs, labels] = compile_statements(statements);

  return new program(instructions, ecs, data, constants, labels);
}

function compile_declarations(declarations) {
  let constants = {};
  let data = {};

  for (let d_i = 0; d_i < declarations.childCount; d_i++) {
    let declaration = declarations.child(s_i);
    let type = declaration.child(0).text;
    let [id, value] = declaration.child(1).text.split(" ");
    switch (type) {
      case "const":
        constants[id] = value;
        break;
      case "data":
        data[id] = value;
        break;
    }
  }

  return [constants, data];
}

function compile_statements(statements) {
  let instructions = new Array();
  let ecs = new ECS();
  let labels = {};
  let l_pc = 0;
  for (let s_i = 0; s_i < statements.childCount; s_i++) {
    let statement = statements.child(s_i);
    //let line_number = parseInt(statement.startPosition.row);
    switch (statement.type) {
      case "label":
        labels[statement.text] = l_pc;
        break;
      case "statement":
        var [bytecode, lineNumber, startIndex, endIndex] = compile_statement(statement);
        instructions.push(bytecode);
        ecs.LineNumber.push(lineNumber);
        ecs.StartIndex.push(startIndex);
        ecs.EndIndex.push(endIndex);
        l_pc++;
        break;
      case ";":
        break;
      case " ":
        break;
    }
  }

  return [instructions, ecs, labels];
}

function compile(tree) {
  // wipe_data();
  if (tree.rootNode.toString().includes("ERROR")) {
    console.log("Syntax Error, see parse below:");
    console.log(tree.rootNode.toString());
    return;
  }
  const declarations =
    tree.rootNode.childCount > 1 ? tree.rootNode.child(0) : [];
  const statements =
    tree.rootNode.childCount > 1
      ? tree.rootNode.child(1)
      : tree.rootNode.child(0);
  let program = compile_program(statements, declarations);
  return program;
}

function get_ecs_for_statement(statement) {
  return [statement.startPosition.row, statement.startIndex, statement.endIndex];
}