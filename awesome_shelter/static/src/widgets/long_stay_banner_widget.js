import { Component, useProps, types as t } from "@odoo/owl";
import { registry } from "@web/core/registry";

class LongStayBannerWidget extends Component {
    static template = "awesome_shelter.LongStayBannerWidget";
    props = useProps({ record: t.object() });

    get animalName() {
        return this.props.record.data["display_name"];
    }
}

const longStayBannerWidget = {
    component: LongStayBannerWidget,
};

registry.category("view_widgets").add("long_stay_banner", longStayBannerWidget);