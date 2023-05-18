class L0Builder {
    data = {};
    const = {};
    statements = [];

    handle(node, rec) {
        rec.bind(this)
        if (node.type === "assignment") {
            switch (node.child(2).childCount) {
                case 1:
                    this.assign(node.child(0), rec(node.child(2).child(0), this.handle));
                    break;
                case 2:
                    this.assign_unary(node.child(0), node.child(2).child(1), rec(node.child(2), this.handle));
                    break;
                case 3:
                    this.assign_binary(node.child(0), rec(node.child(2).child(0), this.handle),node.child(2).child(1), rec(node.child(2).child(2), this.handle));
                    break;
            }
        }
    }

    assign(writer, reader) {
        if (reader.constructor.name !== "Reader") {
            reader = compile_reader(reader);
        }
        var _writer = compile_writer_node(writer)
        this.statements.push(new ByteCode(OP.ASSIGN, [false, _writer, reader]))
    }

    assign_unary(writer, opr, reader) {
        var _reader = compile_reader(reader)
        var _writer = compile_writer_node(writer)
        this.statements.push(new ByteCode(OP.ASSIGN_UN, [false, _writer, opr.text, _reader]))
    }

    assign_binary(writer, reader1, opr, reader2) {
        var _reader1 = compile_reader(reader1)
        var _reader2 = compile_reader(reader2)
        var _writer = compile_writer_node(writer)
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [false, _writer, _reader1, opr.text, _reader2]))
    }
}

class L1Builder extends L0Builder {

    handle(node, rec) {
        if (node.type === "goto") {
            this.goto(node.child(1)) 
        } else if (node.type === "reader") {    
            return node;
        } else {
            super.handle(node, this.handle)
        }
    }

    goto(reader) {
        var _reader1;
        if (reader.type === "label") {
            _reader1 = new Reader(RT.LABEL, reader.text)
        } else if (reader.type === "register") {
            _reader1 = new Reader(RT.REGISTER, reader.text);
        }
        var _reader2 = new Reader(RT.NUMBER, 1)
        var _writer = new Writer(WT.REGISTER, '$!')
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [true, _writer, _reader1, '-', _reader2]))
    }
}

class L2Builder extends L1Builder {
    handle(node, rec) {
        if (node.type === "variable") {
            var variable_name = node.child(0)
            var type = node.child(2)
            var expression = node.child(4)
            this.variable_declaration(variable_name, type, expression)
        } else if (node.child(0).type === "variable_name") {
            return L2Builder.read_variable(node)
        } else if (node.type === "reader") {
            return node;
        }
        else {
            super.handle(node, this.handle)
        }
    }

    variable_declaration(variable_name, type, expression) {
        var updated_variable_name = `&_${variable_name.text}`
        var variable_size = parseInt(type.text.replace(/\D/g, ''));
        variables.variableTypes[variable_name] = type;
        var memory_allocation = "";
        for (var i = 0; i < variable_size/8; i++) {
            memory_allocation += "0";
        }
        this.data[updated_variable_name] = memory_allocation;
        var _expression = compile_expression(expression);
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Writer(WT.REGISTER, '$n'), new Reader(RT.DATA, updated_variable_name)]));
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Writer(WT.MEMORY, '$n', get_datatype(type.text))].concat(_expression)));
    }

        // L2: $x := g
        // L0: 
        // $n := &g;
        // return [$n, u8] 
    read_variable(variable_name) {
        // TODO: fix that if it's a binary assign, they can't both use the $n register
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Writer(WT.REGISTER, '$n'), new Reader(RT.DATA, variable_name)]))
        return new Reader(RT.MEMORY, '$n', variables.variableTypes[variable_name])
    }
}

function BuildSystem(tree) {
    variables.clear();
    var statements = tree.rootNode.child(0);
    var builder = new L2Builder();
    for (var i = 0; i < statements.childCount; i++) {
        if (statements.child(i).text !== ";" && statements.child(i).text !== "\n" && statements.child(i).text !== "") {
            builder.handle(statements.child(i).child(0), null)
        }
    }
    return new Program(builder.statements, {}, builder.data, builder.const, {})
}

function compile_expression(expression) {
    var numOfChildren = expression.childCount
    switch (numOfChildren) {
        case 1: // reader
          var reader = compile_reader(expression.child(0));
          return [reader]
        case 2: // opr, reader
          var opr = expression.child(0).text;
          var reader = compile_reader(expression.child(1));
          return [opr, reader]
        case 3: // reader, opr, reader
          var reader1 = compile_reader(expression.child(0));
          var opr = expression.child(1).text;
          var reader2 = compile_reader(expression.child(2));
          return [reader1, opr, reader2]
    }
}

function create_cooler_node(node) {
    var coolerNode = {
        children: [],

        child(index) {
            return this.children[index]
        }
    }
    coolerNode.type = node.type
    coolerNode.childCount = node.childCount
    coolerNode.children = node.children
    coolerNode.text = node.text
    return coolerNode
}
