Events.eventify = eventify;
Events.onify = onify;
Events.prototype.observe = observe;
Events.prototype.unobserve = unobserve;
Events.prototype.handle = handle;
Events.prototype.unhandle = unhandle;
Events.prototype.handleEvent = handleEvent;
Events.prototype.on = on;
Events.prototype.off = off;
Events.prototype.fire = fire;
module.exports = Events;

/*
   Use on/off to register event listeners.
   Use fire to publish events.
   Use observe/unobserve integrate DOM node events.
   
   Example:
   var newspaper = new Events();
   newspaper.on('article', function(article) {
      console.log('article got published: ' + article.title);
   });
   newspaper.on('click', function(click_event) {
      newspaper.fire({
         type: 'article',
         title: 'Someone Clicked on the Document',
         text: 'Reportedly someone clicked on the document at ' + click_event.x + ',' + click_event.y + '.'
      });
   });
   newspaper.observe(document, 'click');
*/

function Events() {

}

function eventify(obj) {
   mixin(obj, ['observe', 'unobserve', 'handle', 'unhandle', 'handleEvent', 'on', 'off', 'fire']);
}

function onify(obj) {
   mixin(obj, ['on', 'off', 'fire']);
}

function mixin(obj, keys) {
   keys.forEach(function(key) {
      if (!(key in obj)) {
         obj[key] = Events.prototype[key];
      }
   });
}

function observe(obj) {
   console.log(this + ' observes ' + Array.prototype.slice.call(arguments, 1).join(', ') + ' on ' + obj);
   for (var i = 1; i < arguments.length; i++) {
      obj.addEventListener(arguments[i], this, false);
   }
   return this;
}

function unobserve(obj) {
   for (var i = 1; i < arguments.length; i++) {
      obj.removeEventListener(arguments[i], this, false);
   }
   return this;
}

function handle(type, f) {
   this['on' + type] = f;
   return this;
}

function unhandle(type, f) {
   delete this['on', type];
   return this;
}

function handleEvent(e) {
   console.log('handling ' + e.type + ' on ' + this, e);
   var handlerName = 'on' + e.type;
   if (typeof this[handlerName] === 'function') {
      try {
         return this[handlerName](e);
      } catch (ex) {
         console.log(ex);
         throw ex;
      }
   }
}

function on(type, handler) {
   if (!this.handlers) {
      this.handlers = {};
   }
   if (!this.handlers[type]) {
      this.handlers[type] = [];
   }
   if (this.handlers[type].indexOf(handler) < 0) {
      console.log(handler, 'listens for ' + type + ' on', this);
      this.handlers[type].push(handler);
   }
   return this;
}

function off(type, handler) {
   if (this.handlers && this.handlers[type]) {
      var i = this.handlers[type].indexOf(handler);
      if (0 <= i) {
         if (this.handlers[type].length === 1) {
            delete this.handlers[type];
         } else {
            this.handlers[type].splice(i, 1);
         }
      }
   }
   return this;
}

function fire(type, e) {
   if (typeof type === 'object') {
      e = type;
   } else if (typeof e === 'object') {
      e.type = type;
   } else {
      e = {type: type};
   }
   console.log(this, ' fires ', e);
   if (this.handlers && this.handlers[e.type]) {
      var defHandler = this;
      this.handlers[e.type].slice().forEach(function(handler) {
         var f = handler.handleEvent;
         if (typeof f !== 'function') {
            if (typeof handler === 'function') {
               f = handler;
               handler = defHandler;
            } else {
               return;
            }
         }
         try {
            f.call(handler, e);
         } catch (error) {

         }
      });
   }
   return this;
}
