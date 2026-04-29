/**
 * Action widget: <$rybbit-event name="..." properties='{"key":"val"}'/>
 *
 * Use inside button or other action sequences to track custom events.
 *
 * Attributes:
 *   name        {string}  Required. Rybbit event name.
 *   properties  {string}  Optional JSON object of extra properties.
 *
 * Example:
 *   <$button>
 *     点击赞助
 *     <$rybbit-event name="donate-click" properties='{"tier":"gold"}'/>
 *   </$button>
 */

declare const exports: { [k: string]: unknown };
declare const require: (module: string) => Record<string, unknown>;

interface RybbitGlobal {
  event: (name: string, properties?: Record<string, unknown>) => void;
}

interface TwWidgetInstance {
  parentDomNode: Element;
  computeAttributes(): void;
  execute(): void;
  getAttribute(name: string, defaultVal?: string): string;
  getVariable(name: string): string;
  makeChildWidgets(nodes?: unknown[]): void;
  renderChildren(parent: Element, nextSibling: Element | null): void;
}
interface TwWidgetCtor {
  new (...args: unknown[]): TwWidgetInstance;
  prototype: TwWidgetInstance;
}

const Widget = require('$:/core/modules/widgets/widget.js').widget as TwWidgetCtor;

class RybbitEventWidget extends Widget {
  render(parent: Element, nextSibling: Element | null) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
  }

  execute() {
    this.makeChildWidgets();
  }

  invokeAction(_triggeringWidget: unknown, _event: Event): boolean {
    const name = this.getAttribute('name', '');
    if (!name) {
      console.warn('[rybbit-event] "name" attribute is required');
      return false;
    }
    const propertiesStr = this.getAttribute('properties', '{}');
    let properties: Record<string, unknown> = {};
    try {
      properties = JSON.parse(propertiesStr);
    } catch {
      console.warn('[rybbit-event] Invalid JSON in "properties":', propertiesStr);
    }
    const rybbit = (window as unknown as { rybbit?: RybbitGlobal }).rybbit;
    if (rybbit?.event) {
      rybbit.event(name, properties);
    }
    return true;
  }

  allowActionPropagation() {
    return false;
  }
}

exports['rybbit-event'] = RybbitEventWidget;
