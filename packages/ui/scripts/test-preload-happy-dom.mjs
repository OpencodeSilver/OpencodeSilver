// happy-dom 18 defines Node.prototype.nodeName as '' and gives Element its own
// getter that returns the tag name. The DOM instead exposes nodeName on Node
// itself, so a consumer that captures the getter once from Node.prototype —
// DOMPurify 3.4 does exactly that at import time — reads '' for every element,
// treats each as disallowed, and unwraps it. Restore the DOM contract for the
// test environment; browsers are unaffected.
import { Node } from 'happy-dom';

const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName');
if (descriptor?.get && !Object.prototype.hasOwnProperty.call(Node.prototype, '__ocNodeNamePatched')) {
  Object.defineProperty(Node.prototype, 'nodeName', {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      let prototype = Object.getPrototypeOf(this);
      while (prototype && prototype !== Node.prototype) {
        const own = Object.getOwnPropertyDescriptor(prototype, 'nodeName');
        if (own?.get) return own.get.call(this);
        prototype = Object.getPrototypeOf(prototype);
      }
      return '';
    },
  });
  Object.defineProperty(Node.prototype, '__ocNodeNamePatched', { value: true });
}

// In happy-dom 18, MutationObserverListener stores its callback only inside a WeakRef
// without a strong reference on the listener, causing GC to prematurely destroy the callback.
try {
  const PropertySymbol = await import('happy-dom/lib/PropertySymbol.js');
  if (PropertySymbol.observeMutations && Node.prototype[PropertySymbol.observeMutations]) {
    const origObserveMutations = Node.prototype[PropertySymbol.observeMutations];
    Node.prototype[PropertySymbol.observeMutations] = function(listener) {
      if (listener?.callback && typeof listener.callback.deref === 'function') {
        listener.__strongCallback = listener.callback.deref();
      }
      return origObserveMutations.call(this, listener);
    };
  }
} catch {
  // Ignore if PropertySymbol cannot be resolved
}
