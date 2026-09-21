import { Component, useProps } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

class ToothChartField extends Component {
    static template = "awesome_dental_practice.ToothChartField";

    props = useProps({
        name: standardFieldProps.name,
        record: standardFieldProps.record,
    });
}

const toothChartField = {
    component: ToothChartField,
    displayName: _t("ToothChartField"),
    supportedTypes: ["one2many"],
    isEmpty: () => false,
    relatedFields: () => {
        return [
               { name: "name", type: "char" },
               { name: "date", type: "date" },
               { name: "product_id", type: "many2one", relation: "product.product" },
               { name: "partner_id", type: "many2one", relation: "res.partner" },
               { name: "dental_tooth", type: "integer" },
               { name: "color", type: "integer" },
               { name: "dental_care_type", type: "select" },
               { name: "dental_position", type: "selection", selection: [
                    ["outside", _t("Outside")],
                    ["top", _t("Top")],
                    ["inside", _t("Inside")],
                ]},
        ];
    },
};

registry.category("fields").add("tooth_chart", toothChartField);
