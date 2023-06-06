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
            return new Content(CONTENT_TYPES.NUMBER, parseInt(node.text));
        }

        else if (node.type === "constant") {
            return new Content(CONTENT_TYPES.CONSTANT, node.text);
        }

        else if (node.type === "data") {
            return new Content(CONTENT_TYPES.DATA, node.text);
        }

        else if (["memory_access" ,"reader", "writer"].includes(node.type)) {
            return this.handle(node.child(0));
        }

        else if (node.type === "register") {
            return new Content(CONTENT_TYPES.REGISTER, node.text);
        }

        else if (node.type === "memory") {
            return new Content(CONTENT_TYPES.MEMORY, this.handle(node.child(1)), get_datatype(node.child(3).text));
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
            this.push_statement(node, new ByteCode(OP.SYSCALL));
        }
    }

    assign(node, is_conditional, writer, reader) {
        this.push_statement(node, new ByteCode(OP.ASSIGN, [is_conditional, writer, reader]));
    }

    assign_unary(node, is_conditional, writer, opr, reader) {
        this.push_statement(node, new ByteCode(OP.ASSIGN_UN, [is_conditional, writer, opr.text, reader]));
    }

    assign_binary(node, is_conditional, writer, reader1, opr, reader2) {
        this.push_statement(node, new ByteCode(OP.ASSIGN_BIN, [is_conditional, writer, reader1, opr.text, reader2]));
    }

    push_statement(node, byte_code) {
        this.statements.push(byte_code);
        this.ECS.nodes.push(node);
    }
}