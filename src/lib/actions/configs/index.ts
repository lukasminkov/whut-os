import { registerActionConfig } from "../universal-registry";
import { emailActionConfig } from "./email";
import { chartActionConfig } from "./chart";
import { calendarActionConfig } from "./calendar";
import { metricActionConfig } from "./metric";
import { documentActionConfig } from "./document";
import { messageActionConfig } from "./message";
import { fileActionConfig, tableActionConfig, searchActionConfig, imageActionConfig } from "./generic";

// Order matters: more specific configs first
registerActionConfig(emailActionConfig);
registerActionConfig(calendarActionConfig);
registerActionConfig(messageActionConfig);
registerActionConfig(fileActionConfig);
registerActionConfig(documentActionConfig);
registerActionConfig(metricActionConfig);
registerActionConfig(chartActionConfig);
registerActionConfig(tableActionConfig);
registerActionConfig(searchActionConfig);
registerActionConfig(imageActionConfig);
