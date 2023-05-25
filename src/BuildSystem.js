function BuildSystem(tree) {
    variables.clear();
    var builder = get_builder(parseInt(chosenLevel.value));
    builder.handle(tree.rootNode);
    return new Program(builder.statements, {}, builder.data, builder.const, {});
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

const variables = {
  variableTypes: {},
  clear() {
    variableTypes = {};
  }
}