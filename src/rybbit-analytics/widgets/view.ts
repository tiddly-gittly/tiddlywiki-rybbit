/**
 * View widget: <$rybbit-view event="..." tiddler="..." properties='...'/>
 *
 * Fires a Rybbit custom event once when this widget is rendered (impression tracking).
 * Renders no DOM — purely invisible side-effect.
 *
 * Attributes:
 *   event       {string}  Event name. Default: "tiddler-view"
 *   tiddler     {string}  Tiddler name to attach. Default: currentTiddler variable.
 *   properties  {string}  Optional JSON of extra properties merged into payload.
 *
 * Example — track when a tiddler is opened in story river:
 *   \widget $rybbit-view-current()
 *     <$rybbit-view tiddler=<<currentTiddler>>/>
 *   \end
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
}
interface TwWidgetCtor {
  new (...args: unknown[]): TwWidgetInstance;
  prototype: TwWidgetInstance;
}

const Widget = require('$:/core/modules/widgets/widget.js').widget as TwWidgetCtor;

class RybbitViewWidget extends Widget {
  private _tracked = false;

  render(parent: Element, nextSibling: Element | null) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this._fireImpression();
  }

  execute() {
    this.makeChildWidgets();
  }

  private _fireImpression() {
    if (this._tracked) return;
    this._tracked = true;

    const eventName = this.getAttribute('event', 'tiddler-view');
    const tiddler = this.getAttribute('tiddler', this.getVariable('currentTiddler'));
    const propertiesStr = this.getAttribute('properties', '{}');
    let extra: Record<string, unknown> = {};
    try {
      extra = JSON.parse(propertiesStr);
    } catch {}

    const rybbit = (window as unknown as { rybbit?: RybbitGlobal }).rybbit;
    if (rybbit?.event) {
      rybbit.event(eventName, { tiddler, ...extra });
    }
  }
}

exports['rybbit-view'] = RybbitViewWidget;
