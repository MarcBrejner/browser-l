class L3Builder extends L2Builder {
    handle(node) {
        if (node.type === "scope") { 
            var frame = new stack_frame();
            frame.next = this.head;
            this.head = frame;
            this.in_scope = true;
            for (var i = 0; i < node.childCount; i++){
                this.handle(node.child(i));
            }
            this.stack_pointer += Object.keys(frame.variables).length * this.frame_size; // minus 2 because 2 of the children are '{' and '}'
            this.push_statement(node.child(node.childCount-1), new ByteCode(OP.ASSIGN_BIN, [false, new Content(CONTENT_TYPES.REGISTER, '$sp'), new Content(CONTENT_TYPES.REGISTER, '$sp'), '+', new Content(CONTENT_TYPES.NUMBER, Object.keys(frame.variables).length * this.frame_size)]));
            if (this.stack_pointer === 112) {
                this.in_scope = false;
            }
        } 
        else if (node.type === "variable" && this.in_scope) {
            this.stack_pointer -= this.frame_size;
            this.head.variables[node.child(0).text] = [this.stack_pointer, node.child(2).text];
            var expression = super.handle(node.child(4));
            this.push_statement(node, new ByteCode(OP.ASSIGN_BIN, [false, new Content(CONTENT_TYPES.REGISTER, '$sp'), new Content(CONTENT_TYPES.REGISTER, '$sp'), '-', new Content(CONTENT_TYPES.NUMBER, this.frame_size)]));
            this.push_statement(node, new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.REGISTER, '$sp'), get_datatype(node.child(2).text))].concat(expression)))            
        }
        else if (node.type === "variable_name" && this.in_scope) {
            var current = this.head;
            while (current != null) {
                if (node.text in current.variables) {
                    return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.NUMBER, current.variables[node.text][0]), get_datatype(current.variables[node.text][1]));
                }   
                current = current.next;
            }
        }
        else {
            return super.handle(node);
        }
    }

    head = null
    stack_pointer = 112;
    frame_size = 4;
    in_scope = false;
}

class stack_frame {
    next;
    variables;
    constructor() {
        this.next= null;
        this.variables = {};
    }
}
