class L2Visitor extends L1Visitor {
    scope(node) {
        this._emitter.start_scope();
        this.visit(node.child(1));
        this._emitter.end_scope();
    }

    variable(node)  {
        var var_name = node.child(0).text;
        var var_size = node.child(2).text;
        var expression = this.visit(node.child(4));
        return this._emitter.variable(var_name, var_size, expression);
    }

    variable_name(node) {
        var var_name = node.text;

        return this._emitter.variable_name(var_name);
    }
}

class L2Emitter extends L1Emitter{
    variables = {}
    head = null
    stack_pointer = 112;
    frame_pointer = 112;
    in_scope = false;

    constructor() {
        super();
        this._step_draw['L2'] = L2Draw;
        this._step_draw_state['L2']= null;
    }

    variable(var_name, var_size, expression) {
        if (this.in_scope) {
            this.create_temp_var(var_name, var_size, expression);
        } else {
            this.variable_declaration(var_name, var_size, expression)
        }
    }

    variable_name(var_name) {
        if (this.in_scope) {
            return this.read_temp_var(var_name);
        } else {
            var p_var = '&_' + var_name;
            return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
        }
    }

    create_temp_var(var_name, var_size, expression) {
        var variable_size = get_variable_bytesize(var_size);
        this.frame_pointer -= variable_size;
        this.head.variables[var_name] = [this.stack_pointer - this.frame_pointer, var_size];
        var writer = this.read_temp_var(var_name);
        this._step_draw_state['L2'] = [structuredClone(this.variables), structuredClone(this.head)];
        this.assignment(false, writer, expression);
    }

    read_temp_var(var_name) {
        var current = this.head;
        while (current != null) {
            if (var_name in current.variables) {
                return this.memory(this.binary_expression(this.register('$fp'), '-', this.number(current.variables[var_name][0])), get_datatype(current.variables[var_name][1]))
            }   
            current = current.next;
        }
        // TODO: check if node.text is in variable dict otherwise return error
        var p_var = '&_' + var_name;
        return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
    }

    start_scope() {
        var frame = new StackFrame();
        frame.next = this.head;
        this.head = frame;
        this.in_scope = true;

        this.Stack.push(this.frame_pointer);
    }

    end_scope() {
        var offset = this.Stack.pop() - this.frame_pointer;
        this.head = this.head.next;
        this.frame_pointer += offset;
        if (this.head === null) {
            this.in_scope = false;
        }
        this._ECS.overwrite_drawstate('L2', [structuredClone(this.variables), structuredClone(this.head)]);
        this._step_draw_state['L2'] = [structuredClone(this.variables), structuredClone(this.head)];
    }

    variable_declaration(var_name, var_size, expression) {
        var p_var = '&_' + var_name;
        this.variables[p_var] = var_size;
        var memory_allocation = "";

        for (var i = 0; i < get_variable_bytesize(var_size); i++) {
            memory_allocation += "0";
        }
        this._data[p_var] = memory_allocation;
        this._step_draw_state['L2'] = [structuredClone(this.variables), null];
        this.assignment(
            false, 
            this.memory(this.data(p_var), get_datatype(var_size)), 
            expression);
    }

    Stack = {
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

    set_state() {

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

const L2Draw = {
    draw(params, vm) {
        var container = document.getElementById("lx-container");

        var existingContainer = document.getElementById("table-wrapper-container");
        if (existingContainer) {
          container.removeChild(existingContainer);
        }

        var wrapperContainer = document.createElement("div");
        wrapperContainer.id = "table-wrapper-container";

        var variables = params[0];
        this.create_wrapper(variables, vm, wrapperContainer)
        var stack_head = params[1];
        while (stack_head != null) {
            this.create_wrapper(stack_head.variables, vm, wrapperContainer)
            stack_head = stack_head.next;
        }
        
        container.appendChild(wrapperContainer)

    },

    create_wrapper(variables, vm, container){
        var table = this.create_table_from_variables(variables, vm)
        var tableWrapper = document.createElement("L2Div");
        tableWrapper.style.display = "inline-block";
        tableWrapper.appendChild(table);
        
        tableWrapper.style.border = "1px solid black";
        tableWrapper.style.padding = "10px";
        tableWrapper.style.borderCollapse = "collapse";
        container.appendChild(tableWrapper);
    },

    create_table_from_variables(variables, vm){
        var table = document.createElement("L2Table");
        for(var name in variables){
            var row = document.createElement("tr");

            var nameCell = document.createElement("td");
            nameCell.textContent = name;
            nameCell.style.borderRight = "2px solid black";
            nameCell.style.paddingRight = "10px"
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
            valueCell.style.paddingLeft = "10px"
            row.appendChild(valueCell);
            table.appendChild(row);
        }

        return table
    }
}