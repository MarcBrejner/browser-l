class L0Builder {
    data = {};
    const = {};
    labels = {};
    statements = [];
    ECS = new ECS();

    handle(node) {
        if (["source_file", "declarations","statements"].includes(node.type)) { 
            for (var i = 0; i < node.childCount; i++){
                this.handle(node.child(i));
            }
        }

        else if (["statement", "declaration"].includes(node.type)) { 
            this.handle(node.child(0));
        }

        else if (node.type === "expression") {
            switch (node.childCount) {
                case 1:
                    return [this.handle(node.child(0))];
                case 2:
                    return [node.child(0), this.handle(node.child(1))];
                case 3:
                    return [this.handle(node.child(0)), node.child(1), this.handle(node.child(2))];
            }
        }

        else if (node.type === "number") {
            return new Reader(RT.NUMBER, parseInt(node.text));
        }

        else if (node.type === "constant") {
            return new Reader(RT.CONSTANT, node.text);
        }

        else if (node.type === "data") {
            return new Reader(RT.DATA, node.text);
        }

        else if (["memory_access" ,"reader", "writer"].includes(node.type)) {
            return this.handle(node.child(0));
        }

        else if (node.type === "register") {
            if (node.parent.type === "writer") {
                return new Writer(WT.REGISTER, node.text);
            } else if (node.parent.type === "reader" || node.parent.type === "memory_access") {
                return new Reader(RT.REGISTER, node.text);
            } 
        }

        else if (node.type === "memory") {
            if (node.parent.type === "writer") {
                return new Writer(WT.MEMORY, this.handle(node.child(1)), get_datatype(node.child(3).text));
            } else if (node.parent.type === "reader") {
                return new Reader(RT.MEMORY, this.handle(node.child(1)), get_datatype(node.child(3).text));
            }
        }

        else if (node.type === "assignment") {
            var is_conditional = node.child(1).text === "?=" ? true : false;
            var writer = node.child(0);
            var expression = this.handle(node.child(2));
            // TODO: Change such that assign take an expression as input?
            switch (expression.length) {
                case 1:
                    writer = this.handle(writer)
                    var reader = expression[0];
                    this.assign(node, is_conditional, writer, reader);
                    break;
                case 2:
                    writer = this.handle(writer);
                    var opr = expression[0];
                    var reader = expression[1];
                    this.assign_unary(node, is_conditional, writer, opr, reader);
                    break;
                case 3:
                    writer = this.handle(writer);
                    var reader1 = expression[0];
                    var opr = expression[1];
                    var reader2 = expression[2];
                    this.assign_binary(node, is_conditional, writer, reader1, opr, reader2);
                    break;
            }
        }
        
        else if(node.type === "constant_declaration"){
            let id = node.child(1).text;
            let value = node.child(2).text;
            this.const[id] = value;
        }
        
        else if(node.type === "data_declaration"){
            let id = node.child(1).text;
            let value = node.child(2).text;
            this.data[id] = value;
        }
        
        else if(node.type === "label"){
            this.labels[node.text] = this.statements.length;
        }
        
        else if(node.type === "syscall"){
            this.statements.push(new ByteCode(OP.SYSCALL));
            this.set_ECS(node);
        }
    }

    assign(node, is_conditional, writer, reader) {
        this.statements.push(new ByteCode(OP.ASSIGN, [is_conditional, writer, reader]));
        this.set_ECS(node);
    }

    assign_unary(node, is_conditional, writer, opr, reader) {
        this.statements.push(new ByteCode(OP.ASSIGN_UN, [is_conditional, writer, opr.text, reader]));
        this.set_ECS(node);
    }

    assign_binary(node, is_conditional, writer, reader1, opr, reader2) {
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [is_conditional, writer, reader1, opr.text, reader2]));
        this.set_ECS(node);
    }

    set_ECS(node){
        this.ECS.line_number.push(node.startPosition.row);
        this.ECS.start_index.push(node.startIndex);
        this.ECS.end_index.push(node.endIndex);
    }
}

class L1Builder extends L0Builder {
    handle(node) {
        if (node.type === "goto") {
            this.goto(node)//,node.child(1));
        } else {
            return super.handle(node);
        }
    }

    goto(node) {
        var reader = node.child(1);
        var _reader1;
        if (reader.type === "label") {
            _reader1 = new Reader(RT.LABEL, reader.text);
        } else if (reader.type === "register") {
            _reader1 = new Reader(RT.REGISTER, reader.text);
        }
        var _reader2 = new Reader(RT.NUMBER, 1);
        var _writer = new Writer(WT.REGISTER, '$!');
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [true, _writer, _reader1, '-', _reader2]));
        this.set_ECS(node)
    }
}

class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "variable") { 
            this.variable_declaration(node);
        } else if (node.type === "variable_name") {
            return new Reader(RT.MEMORY, new Reader(RT.DATA, '&_' + node.text), get_datatype(variables.variableTypes["&_" + node.text]));
        } else {
            return super.handle(node);
        }
    }

    variable_declaration(node) {
        var variable_name = node.child(0);
        var type = node.child(2);
        var expression = node.child(4);
        var variable_size = parseInt(type.text.replace(/\D/g, ''));
        variables.variableTypes['&_' + variable_name.text] = type.text;
        var memory_allocation = "";
        for (var i = 0; i < variable_size/8; i++) {
            memory_allocation += "0";
        }
        this.data['&_' + variable_name.text] = memory_allocation;
        var _expression = this.handle(expression);
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Writer(WT.MEMORY, new Reader(RT.DATA, '&_' + variable_name.text), get_datatype(type.text))].concat(_expression)));
        this.set_ECS(node)
    }
}

function BuildSystem(tree) {
    variables.clear();
    var builder = new L2Builder();
    builder.handle(tree.rootNode);
    return new Program(builder.statements,builder.ECS, builder.data, builder.const,  builder.labels);
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

// function get_ecs_for_statement(statement) {
//     return [statement.startPosition.row, statement.startIndex, statement.endIndex];
// }
  
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
