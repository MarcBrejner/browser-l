
function emit_code(tree, emit_function_current) {
    const declarations =
      tree.rootNode.childCount > 1 ? tree.rootNode.child(0) : [];
    const statements =
      tree.rootNode.childCount > 1
        ? tree.rootNode.child(1)
        : tree.rootNode.child(0);

    SourceCodeBuilder.clear();
    variables.clear();
    for (let d_i = 0; d_i < declarations.childCount; d_i++) {
      SourceCodeBuilder.addDeclaration(declarations.child(d_i).text);
      // TODO: emit declartions
    }

    for (let s_i = 0; s_i < statements.childCount; s_i++) {
      let statement = statements.child(s_i);
      //let line_number = parseInt(statement.startPosition.row);
      emit_function_current(statement);
    }

    return SourceCodeBuilder.toSourceCode();
}

function emit_down(source_start, emit_functions, parsers, start_level){

  var source_LX = source_start;
  var tree_LX = parsers[start_level].parse(source_LX);
  console.log(tree_LX.rootNode.toString());
  
  for(var i = start_level; i > 0; i--){
    source_LX = emit_code(tree_LX, emit_functions[i]);
    tree_LX = parsers[i-1].parse(source_LX);
  }

  return tree_LX;

}

const variables = {
  variableTypes: {},
  clear() {
    variableTypes = {};
  }
}

const SourceCodeBuilder = {
  declarations: [],
  statements: [],

  toSourceCode() {
      return this.declarations.join('') + this.statements.join('');
  },

  clear() {
      this.declarations = [];
      this.statements = [];
  },

  addDeclaration(declaration) {
    this.declarations.push(declaration);
  },

  addStatement(statement) {
    this.statements.push(statement);
  },
}

function findEnumKey(enumerator,value) 
{
  for (var k in enumerator) if (enumerator[k] == value) return k;
  return null;
}

const dataTypes = {
    u8: 0,
    u16: 1,
    u32: 2,
    u64: 3,
    i8: 4,
    i16: 5,
    i32: 6,
    i64: 7,
    f8: 8,
    f16: 9,
    f32: 10,
    f64: 11
}