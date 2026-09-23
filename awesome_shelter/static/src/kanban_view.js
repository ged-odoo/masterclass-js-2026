import { kanbanView } from "@web/views/kanban/kanban_view";
import { registry } from "@web/core/registry";
import { useEffect } from "@odoo/owl";

class ShelterKanbanController extends kanbanView.Controller {
    setup() {
        super.setup();
        useEffect(() => {
            const interval = window.setInterval(() => this.model.load(), 10000);
            return () => window.clearInterval(interval);
        });
    }
}

const shelterKanbanView = {
    ...kanbanView,
    Controller: ShelterKanbanController,
};

registry.category("views").add("shelter_kanban", shelterKanbanView);