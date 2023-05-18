function get_reader_type(reader) {
  if (reader.child(0).type == "assign" || reader.child(0).type == "datavar") {
    return reader.child(0).child(0).type;
  } else {
    return reader.child(0).type;
  }
}


function get_datatype(datatype_string){
  switch(datatype_string){
    case "u8":
      return new datatype(8,DT.UNSIGNED);
    case "u16":
      return new datatype(16,DT.UNSIGNED);
    case "u32":
      return new datatype(32,DT.UNSIGNED);
    case "u64":
      return new datatype(64,DT.UNSIGNED);
    case "i8":
      return new datatype(8,DT.SIGNED);
    case "i16":
      return new datatype(16,DT.SIGNED);
    case "i32":
      return new datatype(32,DT.SIGNED);
    case "i64":
      return new datatype(64,DT.SIGNED);
    case "f8":
      return new datatype(8,DT.FLOAT);
    case "f16":
      return new datatype(16,DT.FLOAT);
    case "f32":
      return new datatype(32,DT.FLOAT);
    case "f64":
      return new datatype(64,DT.FLOAT);
  }
}


function compile_reader(reader_node) {
  let reader_id = reader_node.text;
  let reader_type = get_reader_type(reader_node);
  switch (reader_type) {
    case "register":
      return new Reader(RT.REGISTER, reader_id);
    case "memory":
      let startindex_register = reader_node.child(0).child(0).child(1).text;
      let datatype_text = reader_node.child(0).child(0).child(3).text;
      return new Reader(RT.MEMORY, startindex_register, get_datatype(datatype_text))
    case "constant":
      return new Reader(RT.CONSTANT, reader_id);
    case "data":
      return new Reader(RT.DATA, reader_id);
    case "label":
      return new Reader(RT.LABEL, reader_id);
    case "number":
      //the number that the reader holds, is the id in this case
      return new Reader(RT.NUMBER, parseInt(reader_id));
  }
}

function compile_writer(statement) {
  let writer_node = statement.child(0).child(0).child(0);
  let writer_id = writer_node.text;
  switch (writer_node.type) {
    case "memory":
      return new Writer(WT.MEMORY, writer_node.child(1).text, get_datatype(writer_node.child(3).text));
    case "register":
      return new Writer(WT.REGISTER, writer_id);
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
        new ByteCode(OP.ASSIGN, [is_conditional, writer, reader])].concat(get_ecs_for_statement(statement));
    case 2: // oper, reader
      var reader = compile_reader(expression.child(1));
      var opr = expression.child(0).text;
      return [new ByteCode(OP.ASSIGN_UN, [is_conditional, writer, opr, reader])].concat(get_ecs_for_statement(statement));
    case 3: // reader, oper, reader
      var reader1 = compile_reader(expression.child(0));
      var opr = expression.child(1).text;
      var reader2 = compile_reader(expression.child(2));
      return [new ByteCode(OP.ASSIGN_BIN, [is_conditional, writer, reader1, opr, reader2,])].concat(get_ecs_for_statement(statement));
  }
}

function compile_statement(statement) {
  if (statement.childCount == 1 && statement.text == "syscall") {
    return [new ByteCode(OP.SYSCALL)].concat(get_ecs_for_statement(statement));;
  } else {
    return compile_assign(statement);
  }
}

function compile_declaration(declaration, constants, data){
  let type = declaration.child(0).text;
  // TODO: hent fra grammar i stedet for
  let data_regex = /(&[_a-zA-Z]+)\s(".+")/;
  let const_regex = /(@[_a-zA-Z]+)\s([0-9]+)/;
  let declaration_string = declaration.child(1).text;
  if (type === "const") {
    let match = declaration_string.match(const_regex);
    let id = match[1];
    let value = match[2];
    constants[id] = value;
  } else if (type === "data") {
    let match = declaration_string.match(data_regex);
    let id = match[1];
    let value = match[2];
    data[id] = value.slice(1, -1);
  }
  return [constants, data]
}

function compile_program(statements, declarations) {
  let [constants, data] = compile_declarations(declarations);
  let [instructions, ecs, labels] = compile_statements(statements);

  return new Program(instructions, ecs, data, constants, labels);
}

function compile_declarations(declarations) {
  let constants = {};
  let data = {};
  for (let d_i = 0; d_i < declarations.childCount; d_i++) {
    let declaration = declarations.child(d_i);
    switch (declaration.type) {
      case "declaration":
        [constants, data] = compile_declaration(declaration, constants, data);
        break;
      case ";":
        break;
      case " ":
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
        ecs.line_number.push(lineNumber);
        ecs.start_index.push(startIndex);
        ecs.end_index.push(endIndex);
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
  // TODO: Add erros on higher levels than 0
  var errors = find_error(tree.rootNode, new Array());

  if(errors.length > 0){
     return new Program([],{},{},{},{},errors[0]);
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

const error_pattern = /(UNEXPECTED\s+'[^']+'|MISSING\s+"[^']+")/g;
function find_error(node, errors){
  if (node.childCount == 0 && !node.isMissing()){
      return [""];
  }
  if(node.type == "ERROR" || node.isMissing()){
    let matches = node.toString().match(error_pattern);  
    let error_msg = matches === null ? "Syntax error on line: "+(node.startPosition.row+1) : "Syntax error: "+matches[0]+" on line: "+(node.startPosition.row+1);
    errors.push(error_msg);
    return errors;
  }

  for (let n_i = 0; n_i < node.childCount; n_i++) {
    let next_node = node.child(n_i);
    find_error(next_node,errors);
  }

  return errors;
}