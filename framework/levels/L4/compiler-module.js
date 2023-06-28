class L4Visitor extends L3Visitor {
    if(node) {
        var guard_expression = this.visit(node.child(1));
        var has_else = this.has_else(node);
        this._emitter.start_if(guard_expression, has_else);
        this.visit(node.child(2));
        this._emitter.end_if(has_else)
        if (has_else) {
            this.visit(node.child(3))
        }
        this._emitter.number_of_if++;
    }

    else(node) {
        this._emitter.start_else();
        this.visit(node.child(1));
        this._emitter.end_else();
    }

    has_else(node) {
        var has_else = false;
        node.children.forEach(c => {
            if (c.type === "else") {
                has_else = true;
            }
        })
        return has_else;
    }
}

class L4Emitter extends L3Emitter{
    start_if(guard_expression, has_else) {
        this.assignment(this.register('$?'), guard_expression, false, true);
        if (has_else) {
            this.goto(this.get_label(`#ELSE_${this.number_of_if}`))
            this.set_label(`#IF_${this.number_of_if}`);
        } else {
            this.goto(this.get_label(`#END_${this.number_of_if}`))
        }
    }

    end_if(has_else) {
        if (has_else) {
            this.assignment(this.register('$?'), this.number(1), false, false);
            this.goto(this.get_label(`#END_${this.number_of_if}`))
        } else {
            this.set_label(`#END_${this.number_of_if}`)
        }
    }

    start_else() {
        this.set_label(`#ELSE_${this.number_of_if}`)
    }

    end_else() {
        this.set_label(`#END_${this.number_of_if}`)
    }

    number_of_if = 1;
}

class L4Draw extends L3Draw {
    constructor(){
        super();
    }

    draw(vm) {
        super.draw(vm);
        return;
    }
}