class L4Visitor extends L3Visitor {
    if(node) {
        var guard_expression = this.visit(node.child(1));
        this._emitter.if(guard_expression);
        this._emitter.goto();
        this._emitter.if_label();
        this.visit(node.child(2));
        this._emitter.end_label();
    }
}

class L4Emitter extends L3Emitter{
    if(guard_expression) {
        // assignment - $?:=guard_expression
        // goto IF_1
        // assignment - $?:=1;
        // goto END_1
        // Label IF_1
        // return
    }
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