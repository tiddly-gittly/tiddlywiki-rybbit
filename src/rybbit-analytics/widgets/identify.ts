/**
 * Action widget: <$rybbit-identify user-id="..." traits='{"name":"Alice"}'/>
 *
 * Associates the current session with a named user in Rybbit.
 * Call after a user logs in.
 *
 * Attributes:
 *   user-id  {string}  Required. Stable unique identifier for the user.
 *   traits   {string}  Optional JSON of user properties (name, email, plan…).
 *
 * To clear identity on logout:
 *   <$rybbit-identify user-id="" clear/>
 */

declare const exports: { [k: string]: unknown };
declare const require: (module: string) => Record<string, unknown>;

interface RybbitGlobal {
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  clearUserId: () => void;
}

interface TwWidgetInstance {
  parentDomNode: Element;
  computeAttributes(): void;
  execute(): void;
  getAttribute(name: string, defaultVal?: string): string;
  makeChildWidgets(nodes?: unknown[]): void;
}
interface TwWidgetCtor {
  new (...args: unknown[]): TwWidgetInstance;
  prototype: TwWidgetInstance;
}

const Widget = require('$:/core/modules/widgets/widget.js').widget as TwWidgetCtor;

class RybbitIdentifyWidget extends Widget {
  render(parent: Element, _nextSibling: Element | null) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
  }

  execute() {
    this.makeChildWidgets();
  }

  invokeAction(_triggeringWidget: unknown, _event: Event): boolean {
    const rybbit = (window as unknown as { rybbit?: RybbitGlobal }).rybbit;
    if (!rybbit) return false;

    // clear attribute present → logout
    if (this.getAttribute('clear', '') !== '') {
      rybbit.clearUserId();
      return true;
    }

    const userId = this.getAttribute('user-id', '').trim();
    if (!userId) {
      console.warn('[rybbit-identify] "user-id" attribute is required');
      return false;
    }
    const traitsStr = this.getAttribute('traits', '{}');
    let traits: Record<string, unknown> = {};
    try {
      traits = JSON.parse(traitsStr);
    } catch {
      console.warn('[rybbit-identify] Invalid JSON in "traits":', traitsStr);
    }
    rybbit.identify(userId, traits);
    return true;
  }

  allowActionPropagation() {
    return false;
  }
}

exports['rybbit-identify'] = RybbitIdentifyWidget;
