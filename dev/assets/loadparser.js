function asciiToBinary(str) {
    return atob(str)
}

function decode(encoded) {
    var binaryString =  asciiToBinary(encoded);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

var encoded_levels = new Array();
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
encoded_levels.push(decode('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AgwRAABBASEFIAJBMGtBCk8NBEEAIQNBLyEBDA8LIABBEjsBBCAAIAAoAgwRAABBACEDQQEhBEEwIQEgAkEiRwRAIAJFIAJBCkZyDQtBASEBC0EBIQUMDgtBACEDDAELQQEhAwsgACADOwEEIAAgACgCDBEAAAtBASEEDAYLIAJB/ABGDQlBKSEBIAJB3wBGDQlBASEEIAJBX3FBwQBrQRpJDQkMBQtBASEEIAJB/ABGDQgMBAtBASEEIAJB/ABGDQcMAwtBACEDQSohAQwGCyACQSFrIgJBHksNACAFIQRBASACdEGBkICABHENBQwBCyAFIQQLIARBAXEPC0EAIQMLQSchAQwBC0EBIQNBAyEBCyAAIAMgACgCCBEFAAwACwALC68XAQAjAAuoFwYABwABAAcAEQABABAAEgABABwAEwABAB8AJAABABsADwAFAAsADAANAA4AEQAGABMAAQADABYAAQAEAAMAAQAgACUAAQAVABYAAgAWABcAGQAEAAcADQAOAA8ACgAbAAEAAAAdAAEABwAgAAEADQAjAAEADgAmAAEADwAEAAEAIQAUAAEAHQAVAAEAHwAiAAEAGQApAAEAGgAKAAcAAQAHAAkAAQANAAsAAQAOAA0AAQAPACkAAQAAAAQAAQAhABQAAQAdABUAAQAfACIAAQAZACkAAQAaAAYAAwABAAMABQABAAQAAwABACAAJQABABUAFgACABYAFwArAAQABwANAA4ADwAKAAcAAQAHAAkAAQANAAsAAQAOAA0AAQAPAAUAAQAhABQAAQAdABUAAQAfABgAAQAYACIAAQAZACkAAQAaAAQABwABAAcAEwABAB8AKAABABwADwAFAAsADAANAA4AEQAEAAcAAQAHABMAAQAfACsAAQAcAA8ABQALAAwADQAOABEABwAHAAEABwALAAEADgANAAEADwAUAAEAHQAVAAEAHwAaAAEAGQApAAEAGgADABsAAQAAAC0AAQACAC8ABAAHAA0ADgAPAAEAMQAGAAMABAAHAA0ADgAPAAMAMwABAAAANQABAAIANwAEAAcADQAOAA8AAQA5AAUAAAAHAA0ADgAPAAEAMwAFAAAABwANAA4ADwACABsAAQAeADsABAALAAwADgARAAEAPQAEAAEABQAGABAAAgA/AAEAAQBBAAEAEAABAEMAAgABABAAAQBFAAIABQAGAAEARwACAAUABgABAEkAAQABAAEASwABAAIAAQBNAAEAAAABAE8AAQALAAEAUQABAAEAAQBTAAEACAABAFUAAQABAAEAVwABAAEAAQBZAAEACgABAFsAAQAIAAEAXQABABIAAQBfAAEAEQABAGEAAQABAAEAYwABAAAAAQBlAAEAAQABAGcAAQABAAEAaQABAAkAAQBrAAEAAAABAG0AAQABAAEAbwABAAEAAQBxAAEADAABAHMAAQABAAAAAAAAAAAAAAAAABcAAAAuAAAATQAAAGwAAACDAAAAogAAALMAAADEAAAA2gAAAOcAAADwAAAA/QAAAAUBAAANAQAAFwEAAB4BAAAlAQAAKgEAAC8BAAA0AQAAOAEAADwBAABAAQAARAEAAEgBAABMAQAAUAEAAFQBAABYAQAAXAEAAGABAABkAQAAaAEAAGwBAABwAQAAdAEAAHgBAAB8AQAAgAEAAIQBAACIAQAAAAAAAAAAAAAAAQABAAABAAABAAABAAABAAABAAABAAABAAABAAABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQAAAAAAAAAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZABoAGwAcAB0AHgAfACAAIQAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABQAAAAAABwAAAAAAAAAAAAAACQALAA0AAAAAAAAAJwAHACUAFgAWACMAIgApAAAAAAAUAAAAFQAGAAUAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAwAAAAAAAAABAQAAAAAAAAAAGQAAAAAAAQEAAAAAAAAAACoAAAAAAAEBAAAAAAAAAAAQAAAAAAABAQAAAAAAAAAACgAAAAAAAQEAAAAAAAAAABUAAAAAAAEBAAAAAAAAAAApAAAAAAABAQAAAAAAAAAAEwAAAAAAAQAAAAAAAAAAAAgAAAAAAAIBAAAAAAAAAQIgAAAAAAAAABkAAAEAAAIBAAAAAAAAAQIgAAAAAAAAACoAAAEAAAEBAAAAAAAAAQIgAAAAAAABAQAAAAAAAAECIQAAAAAAAgEAAAAAAAABAiEAAAAAAAAAEAAAAQAAAgEAAAAAAAABAiEAAAAAAAAACgAAAQAAAgEAAAAAAAABAiEAAAAAAAAAFQAAAQAAAgEAAAAAAAABAiEAAAAAAAAAKQAAAQAAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAQEUAAAAAAABAQAAAAAAAAAADwAAAAAAAQAAAAAAAAABAiEAAAAAAAEBAAAAAAAAAQMgAAAAAAABAQAAAAAAAAEDIQAAAAAAAQEAAAAAAAAAAA4AAAAAAAEAAAAAAAAAAQMhAAAAAAABAQAAAAAAAAEEIQAAAAAAAQEAAAAAAAAAAB8AAAAAAAEBAAAAAAAAAQUfAAAAAAABAQAAAAAAAAEBGwAAAAAAAQEAAAAAAAAAAAkAAAAAAAEBAAAAAAAAAQEcAAAAAAABAQAAAAAAAAAAAgAAAAAAAQEAAAAAAAABAR0AAAAAAAEBAAAAAAAAAQEVAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAABAhMAAAAAAAEBAAAAAAAAAAAhAAAAAAABAQAAAAAAAAAADQAAAAAAAQEAAAAAAAAAAB4AAAAAAAEBAAAAAAAAAQMWAAAAAAABAQAAAAAAAAEDFwAAAAAAAQEAAAAAAAAAACYAAAAAAAEBAAAAAAAAAQEeAAAAAAABAQAAAAAAAAAAHQAAAAAAAQEAAAAAAAAAABwAAAAAAAEBAAAAAAAAAAALAAAAAAABAQAAAAAAAAEBEwAAAAAAAQEAAAAAAAABAxoAAAAAAAEBAAAAAAAAAAAXAAAAAAABAQAAAAAAAAAAEQAAAAAAAQEAAAAAAAACAAAAAAAAAAEBAAAAAAAAAQIbAAAAAAABAQAAAAAAAAEBGQAAAAAAAQEAAAAAAAAAACAAAAAAAAEBAAAAAAAAAQMbAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABzdGF0ZW1lbnQAY29uc3RhbnQAc3RhdGVtZW50cwBtZW1vcnlfYWNjZXNzAGRlY2xhcmF0aW9ucwBvcGVyYXRvcgByZWdpc3RlcgB3cml0ZXIAcmVhZGVyAG51bWJlcgBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAGV4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdHJpbmcAdHlwZQBzb3VyY2VfZmlsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwBzdGF0ZW1lbnRzX3JlcGVhdDEAZGVjbGFyYXRpb25zX3JlcGVhdDEALAAKAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbAAAAAAAAABsAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAbAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANAAAAIgAAAAAAAAATAAAAAAAAACwAAAACAAAAAQAAAAAAAAAFAAAAkAQAAAAAAAAgAwAAIAUAACALAAAAAAAAAAAAAAAAAADQAwAAQAQAAIQEAACGBAAA4AkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACXCQAAqgkAANYJAADPCAAAmwkAAKcJAACkCQAAogkAANQJAACgCQAAhgkAAOoIAACbCQAAeQkAACIJAABxCQAAGQkAADkJAAB/CQAAiwkAAAwJAABaCQAAQAkAAFUJAADzCAAA4AgAANUIAABmCQAAMgkAACsJAAD+CAAAyAgAAL8JAACsCQAA'));
class L1Builder extends L0Builder {
    handle(node) {
        if (node.type === "goto") {
            this.goto(node)
        } else {
            return super.handle(node);
        }
    }

    goto(node) {
        var reader = node.child(1);
        var _reader1;
        if (reader.type === "label") {
            _reader1 = new Content(CONTENT_TYPES.LABEL, reader.text);
        } else if (reader.type === "register") {
            _reader1 = new Content(CONTENT_TYPES.REGISTER, reader.text);
        }
        var _reader2 = new Content(CONTENT_TYPES.NUMBER, 1);
        var _writer = new Content(CONTENT_TYPES.REGISTER, '$!');
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [true, _writer, _reader1, '-', _reader2]));
        this.set_ECS(node)
    }
}
encoded_levels.push(decode('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DwASAAEAMgAHAAMABAAHAAgADgAPABAAAwARAAEAAAA0AAEAAgA2AAUABwAIAA4ADwAQAAMAOAABAAAAOgABAAIAPAAFAAcACAAOAA8AEAABAD4ABgAAAAcACAAOAA8AEAABADgABgAAAAcACAAOAA8AEAACABwAAQAgAEAABAAMAA0ADwASAAEAQgAEAAEABQAGABEAAQBEAAIABQAGAAEARgACAAEAEQACAEgAAQABAEoAAQARAAEATAACAAUABgABAE4AAgAOAA8AAQBQAAEAAQABAFIAAQAAAAEAVAABAAIAAQBWAAEAAQABAFgAAQAMAAEAWgABAAkAAQBcAAEACQABAF4AAQABAAEAYAABAAEAAQBiAAEACwABAGQAAQABAAEAZgABABMAAQBoAAEAEgABAGoAAQABAAEAbAABAAAAAQBuAAEAAQABAHAAAQABAAEAcgABAAoAAQB0AAEAAAABAHYAAQABAAEAeAABAAEAAQB6AAEADQABAHwAAQABAAAAAAAAAAAAAAAAACMAAABGAAAAaQAAAIEAAACZAAAAsAAAAMoAAADbAAAA7AAAAPYAAAAEAQAAEgEAABsBAAAkAQAALgEAADUBAAA6AQAAPwEAAEYBAABLAQAAUAEAAFQBAABYAQAAXAEAAGABAABkAQAAaAEAAGwBAABwAQAAdAEAAHgBAAB8AQAAgAEAAIQBAACIAQAAjAEAAJABAACUAQAAmAEAAJwBAACgAQAApAEAAKgBAAAAAQABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZABoAGwAcAB0AHgAfACAAIQAiACMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAAAAAAHAAkAAAAAAAAAAAAAAAsADQAPAAAAAAAAACkAAwAXACcAJwAlACQAKwArAAAAAAASAAAAFQAGAAQAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQEAAAAAAAAAABsAAAAAAAEBAAAAAAAAAAAsAAAAAAABAQAAAAAAAAAAFgAAAAAAAQEAAAAAAAAAABAAAAAAAAEBAAAAAAAAAAAIAAAAAAABAQAAAAAAAAAAFQAAAAAAAQEAAAAAAAAAACsAAAAAAAEBAAAAAAAAAQIjAAAAAAACAQAAAAAAAAECIwAAAAAAAAAWAAABAAACAQAAAAAAAAECIwAAAAAAAAAQAAABAAACAQAAAAAAAAECIwAAAAAAAAAIAAABAAACAQAAAAAAAAECIwAAAAAAAAAVAAABAAACAQAAAAAAAAECIwAAAAAAAAArAAABAAABAQAAAAAAAAEBGQAAAAAAAgEAAAAAAAABAiIAAAAAAAAAGwAAAQAAAgEAAAAAAAABAiIAAAAAAAAALAAAAQAAAQEAAAAAAAABAiIAAAAAAAEBAAAAAAAAAQEVAAAAAAABAQAAAAAAAAAAEwAAAAAAAQAAAAAAAAAAAAoAAAAAAAEBAAAAAAAAAQMiAAAAAAABAQAAAAAAAAAADwAAAAAAAQAAAAAAAAABAiMAAAAAAAEBAAAAAAAAAQMjAAAAAAABAQAAAAAAAAAADgAAAAAAAQAAAAAAAAABAyMAAAAAAAEBAAAAAAAAAQQjAAAAAAABAQAAAAAAAAAAHQAAAAAAAQEAAAAAAAABBSEAAAAAAAEBAAAAAAAAAAAHAAAAAAABAQAAAAAAAAEBHgAAAAAAAQEAAAAAAAABAR0AAAAAAAEBAAAAAAAAAAAJAAAAAAABAQAAAAAAAAEBHwAAAAAAAQEAAAAAAAAAACEAAAAAAAEBAAAAAAAAAAAZAAAAAAABAQAAAAAAAAECFAAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAAAIwAAAAAAAQEAAAAAAAAAACAAAAAAAAEBAAAAAAAAAQEgAAAAAAABAQAAAAAAAAEDFwAAAAAAAQEAAAAAAAABAxgAAAAAAAEBAAAAAAAAAAAoAAAAAAABAQAAAAAAAAECHAAAAAAAAQEAAAAAAAAAAB8AAAAAAAEBAAAAAAAAAAAeAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAABARQAAAAAAAEBAAAAAAAAAQMbAAAAAAABAQAAAAAAAAEBFgAAAAAAAQEAAAAAAAAAABEAAAAAAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAECHQAAAAAAAQEAAAAAAAABARoAAAAAAAEBAAAAAAAAAAAiAAAAAAABAQAAAAAAAAEDHQAAAAAAbWVtb3J5AGNvbnN0AGFzc2lnbm1lbnQAc3RhdGVtZW50AGNvbnN0YW50AHN0YXRlbWVudHMAbWVtb3J5X2FjY2VzcwBkZWNsYXJhdGlvbnMAb3BlcmF0b3IAcmVnaXN0ZXIAd3JpdGVyAHJlYWRlcgBudW1iZXIAZ290bwBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAGV4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdHJpbmcAdHlwZQBzb3VyY2VfZmlsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwBzdGF0ZW1lbnRzX3JlcGVhdDEAZGVjbGFyYXRpb25zX3JlcGVhdDEALAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAB4AAAAAAAAAAAAAAAAAAAACAAAAAAAAAAIAAAACAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQAAACQAAAAAAAAAFAAAAAAAAAAuAAAAAgAAAAEAAAAAAAAABQAAAOAEAAAAAAAAYAMAAHAFAADQCwAAAAAAAAAAAAAAAAAAEAQAAIAEAADIBAAAygQAAIAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANAoAAEcKAABzCgAAZwkAADgKAABECgAAQQoAANgJAAA/CgAAcQoAAD0KAAAjCgAAggkAADgKAAAWCgAAugkAAA4KAACxCQAA0QkAABwKAAAoCgAApAkAAPcJAADdCQAA8gkAAIsJAAB4CQAAbQkAANgJAAADCgAAygkAAMMJAACWCQAAYAkAAFwKAABJCgAA'));
class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "variable") { 
            this.variable_declaration(node);
        } else if (node.type === "variable_name") {
            return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + node.text), get_datatype(variables.variableTypes["&_" + node.text]));
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
        this.statements.push(new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + variable_name.text), get_datatype(type.text))].concat(_expression)));
        this.set_ECS(node)
    }
}
encoded_levels.push(decode('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GAAZABoAGwAcAB0AHgAfACAAIQAiACMAJAAlACYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAQAAAAEAAAABAAAAADAAAAAwAAAAIAAAAQAAAAAgAAAAIAAAACAAAAAwAAAA8AAAAPAAAAEAAAABAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAkAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQAAAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAQABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABQAAAAcAAAAAAAkAAAAAAAAAAAAAAAsADQAPAAAAAAAAABEAKgAEABYAKAAoACcAJgAtAC0ALQAAAAAAFwAAAC8ABgADAAAAAAAAAAAAAAAAAAEAAAAAAAAAAwAAAAAAAAABAAAAAAAAAAAAHAAAAAAAAQAAAAAAAAAAADAAAAAAAAEAAAAAAAAAAAAVAAAAAAABAQAAAAAAAAAAEQAAAAAAAQEAAAAAAAAAAAgAAAAAAAEBAAAAAAAAAAAvAAAAAAABAAAAAAAAAAAALQAAAAAAAQAAAAAAAAAAACwAAAAAAAEBAAAAAAAAAQImAAAAAAACAAAAAAAAAAECJgAAAAAAAAAVAAABAAACAQAAAAAAAAECJgAAAAAAAAARAAABAAACAQAAAAAAAAECJgAAAAAAAAAIAAABAAACAQAAAAAAAAECJgAAAAAAAAAvAAABAAACAAAAAAAAAAECJgAAAAAAAAAtAAABAAACAAAAAAAAAAECJgAAAAAAAAAsAAABAAABAQAAAAAAAAEBGwAAAAAAAgAAAAAAAAABAiUAAAAAAAAAHAAAAQAAAgAAAAAAAAABAiUAAAAAAAAAMAAAAQAAAQAAAAAAAAABAiUAAAAAAAEBAAAAAAAAAQIlAAAAAAABAAAAAAAAAAEBFwAAAAAAAQEAAAAAAAABARcAAAAAAAEBAAAAAAAAAAATAAAAAAABAAAAAAAAAAAACwAAAAAAAQAAAAAAAAABAyUAAAAAAAEBAAAAAAAAAQMlAAAAAAABAQAAAAAAAAAADwAAAAAAAQAAAAAAAAABAiYAAAAAAAEBAAAAAAAAAQMmAAAAAAABAQAAAAAAAAAAEAAAAAAAAQAAAAAAAAABAyYAAAAAAAEBAAAAAAAAAQQmAAAAAAABAAAAAAAAAAEEJgAAAAAAAQEAAAAAAAAAAB0AAAAAAAEBAAAAAAAAAQUkAAAAAAABAQAAAAAAAAEBIQAAAAAAAQEAAAAAAAABASAAAAAAAAEBAAAAAAAAAAAKAAAAAAABAQAAAAAAAAAAHgAAAAAAAQEAAAAAAAAAABsAAAAAAAEBAAAAAAAAAAAHAAAAAAABAQAAAAAAAAAADgAAAAAAAQEAAAAAAAAAACQAAAAAAAEBAAAAAAAAAQIWAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAAAACMAAAAAAAEBAAAAAAAAAQEjAAAAAAABAQAAAAAAAAECHgAAAAAAAQEAAAAAAAAAACEAAAAAAAEBAAAAAAAAAQMZAAAAAAABAQAAAAAAAAEDGgAAAAAAAQEAAAAAAAAAACsAAAAAAAEBAAAAAAAAAAAgAAAAAAABAQAAAAAAAAAACQAAAAAAAQEAAAAAAAAAACIAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAEBFgAAAAAAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAQMdAAAAAAABAQAAAAAAAAIAAAAAAAAAAQEAAAAAAAAAABIAAAAAAAEBAAAAAAAAAAAZAAAAAAABAQAAAAAAAAEBHAAAAAAAAQEAAAAAAAABAiAAAAAAAAEBAAAAAAAAAQEiAAAAAAABAQAAAAAAAAAAHwAAAAAAAQEAAAAAAAABBR8AAAAAAAEBAAAAAAAAAQMgAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABzdGF0ZW1lbnQAY29uc3RhbnQAc3RhdGVtZW50cwBtZW1vcnlfYWNjZXNzAGRlY2xhcmF0aW9ucwBvcGVyYXRvcgByZWdpc3RlcgB3cml0ZXIAcmVhZGVyAG51bWJlcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AZXhwcmVzc2lvbgBzeXNjYWxsAGxhYmVsAHN0cmluZwB0eXBlAHZhcmlhYmxlX25hbWUAc291cmNlX2ZpbGUAdmFyaWFibGUAZW5kAGRhdGEAXQBbADo9ADsAOgBzdGF0ZW1lbnRzX3JlcGVhdDEAZGVjbGFyYXRpb25zX3JlcGVhdDEALAAKAAAAAAAAAAAAAAAAAAANAAAAJwAAAAAAAAAWAAAAAAAAADMAAAACAAAAAQAAAAAAAAAFAAAAcAYAAAAAAADwAwAAEAcAAHANAAAAAAAAAAAAAAAAAADABAAAQAUAAI4FAACQBQAAoAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACTDAAAowwAANEMAACvCwAAlwwAAKAMAAAgDAAApQwAAKEMAACeDAAAzwwAAJwMAABrDAAAygsAAJcMAABeDAAAAgwAAFYMAAD5CwAAGQwAAGQMAABwDAAAfgwAAOwLAAA/DAAAJQwAADoMAADTCwAAwAsAALULAAAgDAAAigwAAEsMAAASDAAACwwAAN4LAACoCwAAugwAAKcMAAA='));
for (var i = 0; i < encoded_levels.length; i++){
    var opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = "L"+i;
    document.getElementById('levels').appendChild(opt);
}
document.getElementById('levels').value = 2;

function get_builder(level) {
  switch (level) {
        case 0:
            return new L0Builder();
        case 1:
            return new L1Builder();
        case 2:
            return new L2Builder();
}
}