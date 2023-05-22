class L0Builder {
    data = {};
    const = {};
    labels = {};
    statements = [];
    L0types = ["number","assign","datavar", "constant"];

    handle(node) {
        if (node.type === "statement") { 
            this.handle(node.child(0));
        }

        if (node.type === "declaration") {
            this.handle(node.child(0));
        }

        if (node.type === "assignment") {
            var is_conditional = node.child(1).text === "?=" ? true : false;
            var writer = node.child(0);
            switch (node.child(2).childCount) {
                case 1:
                    var reader_node = node.child(2).child(0);
                    var reader = this.get_reader(reader_node);
                    this.assign(is_conditional, writer, reader);
                    break;
                case 2:
                    var opr = node.child(2).child(1);
                    var reader_node = node.child(2);
                    var reader = this.get_reader(reader_node);
                    this.assign_unary(is_conditional, writer, opr, reader);
                    break;
                case 3:
                    var opr = node.child(2).child(1);
                    var reader_node1 = node.child(2).child(0);
                    var reader_node2 = node.child(2).child(2);
                    var reader1 = this.get_reader(reader_node1);
                    var reader2 = this.get_reader(reader_node2);
                    this.assign_binary(is_conditional, writer,reader1 ,opr, reader2);
                    break;
            }
        } else if(node.type === "constant_declaration"){
            let id = node.child(1).text;
            let value = node.child(2).text;
            this.const[id] = value;
        } else if(node.type === "data_declaration"){
            let id = node.child(1).text;
            let value = node.child(2).text;
            this.data[id] = value;
        } else if(node.type === "label"){
            this.labels[node.text] = this.statements.length;
        } else if(node.type === "syscall"){
            this.statements.push(new ByteCode(OP.SYSCALL));
        }
    }

    get_reader(reader_node){
        /*
        if (reader_node.type === "number") {
        return Reader(...)
        }
        */
        return this.L0types.includes(reader_node.child(0).type) ? reader_node : this.handle(reader_node);
    }

    assign(is_conditional, writer, reader) {
        if (reader.constructor.name !== "Reader") {
            reader = compile_reader(reader);
        }
        writer = compile_writer_node(writer);
        this.statements.push(new ByteCode(OP.ASSIGN, [is_conditional, writer, reader]));
    }

    assign_unary(is_conditional, writer, opr, reader) {
        if (reader.constructor.name !== "Reader") {
            reader = compile_reader(reader);
        }
        writer = compile_writer_node(writer);
        this.statements.push(new ByteCode(OP.ASSIGN_UN, [is_conditional, writer, opr.text, reader]));
    }

    assign_binary(is_conditional, writer, reader1, opr, reader2) {
        if (reader1.constructor.name !== "Reader") {
            reader1 = compile_reader(reader1);
        }
        if (reader2.constructor.name !== "Reader") {
            reader2 = compile_reader(reader2);
        }
        writer = compile_writer_node(writer);
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [is_conditional, writer, reader1, opr.text, reader2]));
    }
}

class L1Builder extends L0Builder {

    handle(node) {
        if (node.type === "goto") {
            this.goto(node.child(1));
        } else {
            super.handle(node);
        }
    }

    goto(reader) {
        var _reader1;
        if (reader.type === "label") {
            _reader1 = new Reader(RT.LABEL, reader.text);
        } else if (reader.type === "register") {
            _reader1 = new Reader(RT.REGISTER, reader.text);
        }
        var _reader2 = new Reader(RT.NUMBER, 1);
        var _writer = new Writer(WT.REGISTER, '$!');
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [true, _writer, _reader1, '-', _reader2]));
    }
}

class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "variable") {
            var variable_name = node.child(0);
            var type = node.child(2);
            var expression = node.child(4);
            this.variable_declaration(variable_name.text, type.text, expression);
        } else if (node.type === "variable_name") {
            return this.read_variable(node);
        } else {
            super.handle(node);
        }
    }

    variable_declaration(variable_name, type, expression) {
        var updated_variable_name = `&_${variable_name}`;
        var variable_size = parseInt(type.replace(/\D/g, ''));
        variables.variableTypes[updated_variable_name] = type;
        var memory_allocation = "";
        for (var i = 0; i < variable_size/8; i++) {
            memory_allocation += "0";
        }
        this.data[updated_variable_name] = memory_allocation;
        var _expression = compile_expression(expression);
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Writer(WT.REGISTER, '$n'), new Reader(RT.DATA, updated_variable_name)]));
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Writer(WT.MEMORY, '$n', get_datatype(type))].concat(_expression)));
    }

        // L2: $x := g
        // L0: 
        // $n := &g;
        // return [$n, u8] 
    read_variable(variable_node) {
        // TODO: fix that if it's a binary assign, they can't both use the $n register
        var variable_name = variable_node.text;
        var updated_variable_name = `&_${variable_name}`;
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Writer(WT.REGISTER, '$n'), new Reader(RT.DATA, updated_variable_name)]));
        return new Reader(RT.MEMORY, '$n', get_datatype(variables.variableTypes[updated_variable_name]));
    }
    /*
    get_reader(readernode, rec) {
        if (readernode.type  === "variable") ...BuildSystem
        else {super().get_reader(readernode);}
    }
    */
}

function BuildSystem(tree) {
    variables.clear();
    var builder = new L2Builder();
    // builder.handle(tree.rootNode, builder);
    
    for (var j = 0; j < tree.rootNode.childCount; j++){
        var subtree = tree.rootNode.child(j);
        for (var i = 0; i < subtree.childCount; i++) {
            if (subtree.child(i).text !== ";" && subtree.child(i).text !== "\n" && subtree.child(i).text !== "") {
                builder.handle(subtree.child(i));
            }
        }
    }
    
    return new Program(builder.statements, {}, builder.data, builder.const, {});
}

function compile_expression(expression) {
    var numOfChildren = expression.childCount
    switch (numOfChildren) {
        case 1: // reader
          var reader = compile_reader(expression.child(0));
          return [reader];
        case 2: // opr, reader
          var opr = expression.child(0).text;
          var reader = compile_reader(expression.child(1));
          return [opr, reader];
        case 3: // reader, opr, reader
          var reader1 = compile_reader(expression.child(0));
          var opr = expression.child(1).text;
          var reader2 = compile_reader(expression.child(2));
          return [reader1, opr, reader2];
    }
}

function get_reader_type(reader) {
    if (reader.child(0).type == "assign" || reader.child(0).type == "datavar") {
      return reader.child(0).child(0).type;
    } else if (reader.child(0).type == "number"){
      return reader.child(0).type;
    } else {
      return reader.type;
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
        return new Reader(RT.MEMORY, startindex_register, get_datatype(datatype_text));
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

function compile_writer_node(writer) {
    let writer_node = writer.child(0).child(0);
    let writer_id = writer_node.text;
    switch (writer_node.type) {
        case "memory":
        return new Writer(WT.MEMORY, writer_node.child(1).text, get_datatype(writer_node.child(3).text));
        case "register":
        return new Writer(WT.REGISTER, writer_id);
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
