function BuildSystem(tree) {
    var level = parseInt(chosenLevel.value);
    var emitter = get_emitter(level);
    var visitor = get_visitor(level);
    visitor._emitter = emitter;
    //console.log(tree.rootNode.toString());
    var error_msg = find_error(tree.rootNode, new Array())[0];
    console.log(tree.rootNode.toString())
    //builder.handle(tree.rootNode);
    visitor.visit(tree.rootNode);
    return new Program(
      visitor._emitter._statements, 
      visitor._emitter._ECS, 
      visitor._emitter._data, 
      visitor._emitter._const, 
      visitor._emitter._labels, 
      visitor._emitter._static_draws, 
      visitor._emitter._step_draw, 
      error_msg
    );
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

function get_variable_bytesize(datatype_string) {
    var datatype = get_datatype(datatype_string);
    return datatype.size / 8;
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

function get_left_child(expression) {
  for (var i = 0; i < expression.childCount; i++) {
      if (expression.child(i).type === 'expression' || expression.child(i).type === 'reader') {
          return expression.child(i);
      }
  }
}

function get_right_child(expression) {
  for (var i = expression.childCount-1; i > 0; i--) {
      if (expression.child(i).type === 'expression' || expression.child(i).type === 'reader') {
          return expression.child(i);
      }
  }
}

function get_operator(expression) {
  var operators = ['*', '/', '-', '+', 'logical_operator', 'operator'];
  for (var i = 0; i < expression.childCount; i++) {
      if (operators.includes(expression.child(i).type)) {
          return expression.child(i);
      }
  }
}

function get_opcode(content) {
  if (content.type === CONTENT_TYPES.BIN_EXPRESSION) {
      return OP.ASSIGN_BIN;
  } else if (content.type === CONTENT_TYPES.UN_EXPRESSION) {
      return OP.ASSIGN_UN;
  } else {
      return OP.ASSIGN;
  }
}

function convert_content_to_array(content) {
  switch (content.type) {
      case CONTENT_TYPES.EXPRESSION:
          return [content.reader1];
      case CONTENT_TYPES.UN_EXPRESSION:
          return [content.opr, content.reader1];
      case CONTENT_TYPES.BIN_EXPRESSION:
          return [content.reader1, content.opr, content.reader2]
      default:
          return [content];
  }
}

