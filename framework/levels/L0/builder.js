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