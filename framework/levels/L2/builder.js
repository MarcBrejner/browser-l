class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "scope") { 
            var frame = new StackFrame();
            frame.next = this.head;
            this.head = frame;
            this.in_scope = true;
            Stack.push(this.variable_pointer);
            for (var i = 0; i < node.childCount; i++){
                this.handle(node.child(i));
            }
            var offset = Stack.pop() - this.variable_pointer;
            this.head = frame.next;
            this.variable_pointer += offset;
            if (this.variable_pointer === 112) {
                this.in_scope = false;
            }
        } 
        else if (node.type === "variable" && this.in_scope) {
            var variable_size = get_variable_bytesize(node.child(2).text);
            this.variable_pointer -= variable_size;
            this.head.variables[node.child(0).text] = [this.stack_pointer - this.variable_pointer, node.child(2).text];
            var expression = super.handle(node.child(4));
            this.push_statement(node, new ByteCode(this.get_opcode(expression), [false, new Content(CONTENT_TYPES.MEMORY, new Expression(CONTENT_TYPES.BIN_EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$sp'), '-', new Content(CONTENT_TYPES.NUMBER, this.stack_pointer - this.variable_pointer)), get_datatype(node.child(2).text))].concat(this.convert_expression_to_array(expression))));            
        }
        else if (node.type === "variable_name" && this.in_scope) {
            var current = this.head;
            while (current != null) {
                if (node.text in current.variables) {
                    return new Content(CONTENT_TYPES.MEMORY, new Expression(CONTENT_TYPES.BIN_EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$sp'), '-', new Content(CONTENT_TYPES.NUMBER,  current.variables[node.text][0])),  get_datatype(current.variables[node.text][1]));
                }   
                current = current.next;
            }
        }
        else if (node.type === "variable") { 
            this.variable_declaration(node);
        } else if (node.type === "variable_name") {
            return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + node.text), get_datatype(this.variables["&_" + node.text]));
        } else {
            return super.handle(node);
        }
    }

    variable_declaration(node) {
        var variable_name = node.child(0);
        var type = node.child(2);
        var expression = node.child(4);
        var variable_size = parseInt(type.text.replace(/\D/g, ''));
        this.variables['&_' + variable_name.text] = type.text;
        var memory_allocation = "";
        for (var i = 0; i < variable_size/8; i++) {
            memory_allocation += "0";
        }
        this.data['&_' + variable_name.text] = memory_allocation;
        var expression = this.handle(expression);
        this.push_statement(node, new ByteCode(this.get_opcode(expression), [false, new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + variable_name.text), get_datatype(type.text))].concat(this.convert_expression_to_array(expression))));
    }

    get_frame_size(variables) {
        var max = 0;
        for (var key in variables) {
            if (variables[key][0] > max) {
                max = variables[key][0];
            }
        }
        return max;
    }

    get_opcode(expression) {
        if (expression.type === CONTENT_TYPES.BIN_EXPRESSION) {
            return OP.ASSIGN_BIN;
        } else if (expression.type === CONTENT_TYPES.UN_EXPRESSION) {
            return OP.ASSIGN_UN;
        } else if (expression.type === CONTENT_TYPES.EXPRESSION) {
            return OP.ASSIGN;
        }
    }

    variables = {}
    head = null
    stack_pointer = 112;
    variable_pointer = 112;
    in_scope = false;

    convert_expression_to_array(expression) {
        switch (expression.type) {
            case CONTENT_TYPES.EXPRESSION:
                return [expression.reader1];
            case CONTENT_TYPES.UN_EXPRESSION:
                return [expression.opr, expression.reader1];
            case CONTENT_TYPES.BIN_EXPRESSION:
                return [expression.reader1, expression.opr, expression.reader2]
        }
    }
}

class StackFrame {
    next;
    variables;
    constructor() {
        this.next= null;
        this.variables = {};
    }
}

const Stack = {
    items: [],

    push(element)
    {
        this.items.push(element);
    },

    pop()
    {
        if (this.items.length == 0)
            return "Underflow";
        return this.items.pop();
    }
}