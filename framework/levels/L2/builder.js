class L2Builder extends L1Builder {
    scope(node) {
        this.start_scope();
        this.visit(node.child(1));
        this.end_scope();
    }

    variable(node)  {
        return this.emit_variable(node);
    }

    variable_name(node) {
        return this.emit_variable_name(node);
    }

    emit_variable(node) {
        if (node.type === "variable" && this.in_scope) {
            this.create_temp_var(node, node.child(0).text, node.child(2).text, node.child(4));
        }
        else if (node.type === "variable") { 
            this.variable_declaration(node)
        }
    }

    emit_variable_name(node) {
        if (node.type === "variable_name" && this.in_scope) {
            return this.read_temp_var(node.text);
        }
        else if (node.type === "variable_name") {
            return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + node.text), get_datatype(this.variables["&_" + node.text]));
        }
    }

    create_temp_var(node, var_name, var_size, node_expression) {
        var variable_size = get_variable_bytesize(var_size);
        this.frame_pointer -= variable_size;
        this.head.variables[var_name] = [this.stack_pointer - this.frame_pointer, var_size];
        var expression = this.visit(node_expression);
        var writer = this.read_temp_var(var_name);
        const snapshot = structuredClone(this.head.variables);
        this.assign(node, false, writer, expression,this.L2Draw, [snapshot]);
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
        this._data['&_' + variable_name.text] = memory_allocation;
        var expression = this.visit(expression);
        const snapshot = structuredClone(this.variables);
        this.assign(node, false, new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + variable_name.text), get_datatype(type.text)), expression, this.L2Draw, [snapshot]);
    }

    variables = {}
    head = null
    stack_pointer = 112;
    frame_pointer = 112;
    in_scope = false;


    L2Draw = function(params, vm) {

        var container = document.getElementById("lx-container");
    
        var existing_table = container.querySelector("L2-table")
        if(existing_table){
            container.removeChild(existing_table)
        }
    
        var table = document.createElement("L2-table");
        table.style.width = "50%";
        table.style.border = "1p"
        var variables = params[0];
    
        for(var name in variables){
            var row = document.createElement("tr");
    
            var nameCell = document.createElement("td");
            nameCell.textContent = name;
            row.appendChild(nameCell);
    
    
            var value = variables[name];
            var valueCell = document.createElement("td");
            var memory_access;
            //Check if scoped
            if(Array.isArray(value)){
                memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.NUMBER, 112-value[0]), get_datatype(value[1]));
            }else{
                memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, name), get_datatype(value));
            }
            
            valueCell.textContent = vm.read(memory_access);
            row.appendChild(valueCell);
            table.appendChild(row);
        }
        container.appendChild(table);
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

