class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "scope") { 
            this.create_scope(node);
        } 
        else if (node.type === "variable" && this.in_scope) {
            this.create_temp_var(node, node.child(0).text, node.child(2).text, node.child(4));
        }
        else if (node.type === "variable_name" && this.in_scope) {
            return this.read_temp_var(node.text);
        }
        else if (node.type === "variable") { 
            this.variable_declaration(node);
        } else if (node.type === "variable_name") {
            return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + node.text), get_datatype(this.variables["&_" + node.text]));
        } else {
            return super.handle(node);
        }
    }

    create_temp_var(node, var_name, var_size, node_expression) {
        var variable_size = get_variable_bytesize(var_size);
        this.variable_pointer -= variable_size;
        this.head.variables[var_name] = [this.stack_pointer - this.variable_pointer, var_size];
        var expression = super.handle(node_expression);
        this.push_statement(node, new ByteCode(this.get_opcode(expression), [false, new Content(CONTENT_TYPES.MEMORY, new Expression(CONTENT_TYPES.BIN_EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$sp'), '-', new Content(CONTENT_TYPES.NUMBER, this.stack_pointer - this.variable_pointer)), get_datatype(var_size))].concat(this.convert_expression_to_array(expression))));
    }

    read_temp_var(var_name) {
        var current = this.head;
        while (current != null) {
            if (var_name in current.variables) {
                return new Content(CONTENT_TYPES.MEMORY, new Expression(CONTENT_TYPES.BIN_EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$sp'), '-', new Content(CONTENT_TYPES.NUMBER,  current.variables[var_name][0])),  get_datatype(current.variables[var_name][1]));
            }   
            current = current.next;
        }
        // TODO: check if node.text is in variable dict otherwise return error
        return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + var_name), get_datatype(this.variables["&_" + var_name]));
    }

    create_scope(node) {
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

    get_opcode(expression) {
        if (expression.type === CONTENT_TYPES.BIN_EXPRESSION) {
            return OP.ASSIGN_BIN;
        } else if (expression.type === CONTENT_TYPES.UN_EXPRESSION) {
            return OP.ASSIGN_UN;
        } else {
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
            default:
                return [expression];
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