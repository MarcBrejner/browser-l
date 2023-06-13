class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "scope") { 
            this.start_scope();
            this.handle(node.child(1));
            this.end_scope();
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
        this.frame_pointer -= variable_size;
        this.head.variables[var_name] = [this.stack_pointer - this.frame_pointer, var_size];
        var expression = this.handle(node_expression);
        var writer = this.read_temp_var(var_name);
        this.assign(node, false, writer, expression);
    }

    read_temp_var(var_name) {
        var current = this.head;
        while (current != null) {
            if (var_name in current.variables) {
                return new Content(CONTENT_TYPES.MEMORY, new Expression(CONTENT_TYPES.BIN_EXPRESSION, new Content(CONTENT_TYPES.REGISTER, '$fp'), '-', new Content(CONTENT_TYPES.NUMBER,  current.variables[var_name][0])),  get_datatype(current.variables[var_name][1]));
            }   
            current = current.next;
        }
        // TODO: check if node.text is in variable dict otherwise return error
        return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + var_name), get_datatype(this.variables["&_" + var_name]));
    }

    start_scope() {
        var frame = new StackFrame();
        frame.next = this.head;
        this.head = frame;
        this.in_scope = true;

        Stack.push(this.frame_pointer);
    }

    end_scope() {
        var offset = Stack.pop() - this.frame_pointer;
        this.head = this.head.next;
        this.frame_pointer += offset;
        if (this.head === null) {
            this.in_scope = false;
        }
    }

    variable_declaration(node) {
        var variable_name = node.child(0);
        var type = node.child(2);
        var expression = node.child(4);
        this.variables['&_' + variable_name.text] = type.text;
        var memory_allocation = "";
        for (var i = 0; i < get_variable_bytesize(type.text); i++) {
            memory_allocation += "0";
        }
        this.data['&_' + variable_name.text] = memory_allocation;
        var expression = this.handle(expression);
        this.assign(node, false, new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + variable_name.text), get_datatype(type.text)), expression);
    }

    variables = {}
    head = null
    stack_pointer = 112;
    frame_pointer = 112;
    in_scope = false;
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