
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function fix_and_destroy_block(block, lookup) {
        block.f();
        destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next, lookup.has(block.key));
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.21.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/GoogleAnalytics.svelte generated by Svelte v3.21.0 */

    const file = "src/components/GoogleAnalytics.svelte";

    function create_fragment(ctx) {
    	let script0;
    	let script1;
    	let script1_src_value;

    	const block = {
    		c: function create() {
    			script0 = element("script");
    			script0.textContent = "window.ga =\n      window.ga ||\n      function() {\n        (ga.q = ga.q || []).push(arguments);\n      };\n    ga.l = +new Date();\n    ga(\"create\", \"UA-82144226-7\", \"auto\");\n    ga(\"send\", \"pageview\");\n  ";
    			script1 = element("script");
    			add_location(script0, file, 1, 2, 16);
    			script1.async = true;
    			if (script1.src !== (script1_src_value = "https://www.google-analytics.com/analytics.js")) attr_dev(script1, "src", script1_src_value);
    			add_location(script1, file, 11, 2, 242);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, script0);
    			append_dev(document.head, script1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(script0);
    			detach_dev(script1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GoogleAnalytics> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("GoogleAnalytics", $$slots, []);
    	return [];
    }

    class GoogleAnalytics extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GoogleAnalytics",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    class Store {
        constructor(dbName = 'keyval-store', storeName = 'keyval') {
            this.storeName = storeName;
            this._dbp = new Promise((resolve, reject) => {
                const openreq = indexedDB.open(dbName, 1);
                openreq.onerror = () => reject(openreq.error);
                openreq.onsuccess = () => resolve(openreq.result);
                // First time setup: create an empty object store
                openreq.onupgradeneeded = () => {
                    openreq.result.createObjectStore(storeName);
                };
            });
        }
        _withIDBStore(type, callback) {
            return this._dbp.then(db => new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, type);
                transaction.oncomplete = () => resolve();
                transaction.onabort = transaction.onerror = () => reject(transaction.error);
                callback(transaction.objectStore(this.storeName));
            }));
        }
    }
    let store;
    function getDefaultStore() {
        if (!store)
            store = new Store();
        return store;
    }
    function get(key, store = getDefaultStore()) {
        let req;
        return store._withIDBStore('readonly', store => {
            req = store.get(key);
        }).then(() => req.result);
    }
    function set(key, value, store = getDefaultStore()) {
        return store._withIDBStore('readwrite', store => {
            store.put(value, key);
        });
    }

    const dbGet = get;
    const dbSet = set;

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    /**
     * lodash (Custom Build) <https://lodash.com/>
     * Build: `lodash modularize exports="npm" -o ./`
     * Copyright jQuery Foundation and other contributors <https://jquery.org/>
     * Released under MIT license <https://lodash.com/license>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     */

    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0,
        MAX_SAFE_INTEGER = 9007199254740991,
        MAX_INTEGER = 1.7976931348623157e+308,
        NAN = 0 / 0;

    /** Used as references for the maximum length and index of an array. */
    var MAX_ARRAY_LENGTH = 4294967295;

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]',
        funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        mapTag = '[object Map]',
        objectTag = '[object Object]',
        promiseTag = '[object Promise]',
        setTag = '[object Set]',
        stringTag = '[object String]',
        symbolTag = '[object Symbol]',
        weakMapTag = '[object WeakMap]';

    var dataViewTag = '[object DataView]';

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to match leading and trailing whitespace. */
    var reTrim = /^\s+|\s+$/g;

    /** Used to detect bad signed hexadecimal string values. */
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

    /** Used to detect binary string values. */
    var reIsBinary = /^0b[01]+$/i;

    /** Used to detect host constructors (Safari). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used to detect octal string values. */
    var reIsOctal = /^0o[0-7]+$/i;

    /** Used to detect unsigned integer values. */
    var reIsUint = /^(?:0|[1-9]\d*)$/;

    /** Used to compose unicode character classes. */
    var rsAstralRange = '\\ud800-\\udfff',
        rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
        rsComboSymbolsRange = '\\u20d0-\\u20f0',
        rsVarRange = '\\ufe0e\\ufe0f';

    /** Used to compose unicode capture groups. */
    var rsAstral = '[' + rsAstralRange + ']',
        rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
        rsFitz = '\\ud83c[\\udffb-\\udfff]',
        rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
        rsNonAstral = '[^' + rsAstralRange + ']',
        rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
        rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
        rsZWJ = '\\u200d';

    /** Used to compose unicode regexes. */
    var reOptMod = rsModifier + '?',
        rsOptVar = '[' + rsVarRange + ']?',
        rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
        rsSeq = rsOptVar + reOptMod + rsOptJoin,
        rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

    /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
    var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

    /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
    var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');

    /** Built-in method references without a dependency on `root`. */
    var freeParseInt = parseInt;

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = freeGlobal || freeSelf || Function('return this')();

    /**
     * A specialized version of `_.map` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function arrayMap(array, iteratee) {
      var index = -1,
          length = array ? array.length : 0,
          result = Array(length);

      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }

    /**
     * Converts an ASCII `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function asciiToArray(string) {
      return string.split('');
    }

    /**
     * The base implementation of `_.times` without support for iteratee shorthands
     * or max array length checks.
     *
     * @private
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     */
    function baseTimes(n, iteratee) {
      var index = -1,
          result = Array(n);

      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }

    /**
     * The base implementation of `_.values` and `_.valuesIn` which creates an
     * array of `object` property values corresponding to the property names
     * of `props`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array} props The property names to get values for.
     * @returns {Object} Returns the array of property values.
     */
    function baseValues(object, props) {
      return arrayMap(props, function(key) {
        return object[key];
      });
    }

    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    /**
     * Checks if `string` contains Unicode symbols.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {boolean} Returns `true` if a symbol is found, else `false`.
     */
    function hasUnicode(string) {
      return reHasUnicode.test(string);
    }

    /**
     * Checks if `value` is a host object in IE < 9.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
     */
    function isHostObject(value) {
      // Many host objects are `Object` objects that can coerce to strings
      // despite having improperly defined `toString` methods.
      var result = false;
      if (value != null && typeof value.toString != 'function') {
        try {
          result = !!(value + '');
        } catch (e) {}
      }
      return result;
    }

    /**
     * Converts `iterator` to an array.
     *
     * @private
     * @param {Object} iterator The iterator to convert.
     * @returns {Array} Returns the converted array.
     */
    function iteratorToArray(iterator) {
      var data,
          result = [];

      while (!(data = iterator.next()).done) {
        result.push(data.value);
      }
      return result;
    }

    /**
     * Converts `map` to its key-value pairs.
     *
     * @private
     * @param {Object} map The map to convert.
     * @returns {Array} Returns the key-value pairs.
     */
    function mapToArray(map) {
      var index = -1,
          result = Array(map.size);

      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }

    /**
     * Creates a unary function that invokes `func` with its argument transformed.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {Function} transform The argument transform.
     * @returns {Function} Returns the new function.
     */
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }

    /**
     * Converts `set` to an array of its values.
     *
     * @private
     * @param {Object} set The set to convert.
     * @returns {Array} Returns the values.
     */
    function setToArray(set) {
      var index = -1,
          result = Array(set.size);

      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }

    /**
     * Converts `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function stringToArray(string) {
      return hasUnicode(string)
        ? unicodeToArray(string)
        : asciiToArray(string);
    }

    /**
     * Converts a Unicode `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function unicodeToArray(string) {
      return string.match(reUnicode) || [];
    }

    /** Used for built-in method references. */
    var funcProto = Function.prototype,
        objectProto = Object.prototype;

    /** Used to detect overreaching core-js shims. */
    var coreJsData = root['__core-js_shared__'];

    /** Used to detect methods masquerading as native. */
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
      return uid ? ('Symbol(src)_1.' + uid) : '';
    }());

    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var objectToString = objectProto.toString;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /** Built-in value references. */
    var Symbol$1 = root.Symbol,
        iteratorSymbol = Symbol$1 ? Symbol$1.iterator : undefined,
        propertyIsEnumerable = objectProto.propertyIsEnumerable;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeFloor = Math.floor,
        nativeKeys = overArg(Object.keys, Object),
        nativeRandom = Math.random;

    /* Built-in method references that are verified to be native. */
    var DataView = getNative(root, 'DataView'),
        Map$1 = getNative(root, 'Map'),
        Promise$1 = getNative(root, 'Promise'),
        Set$1 = getNative(root, 'Set'),
        WeakMap = getNative(root, 'WeakMap');

    /** Used to detect maps, sets, and weakmaps. */
    var dataViewCtorString = toSource(DataView),
        mapCtorString = toSource(Map$1),
        promiseCtorString = toSource(Promise$1),
        setCtorString = toSource(Set$1),
        weakMapCtorString = toSource(WeakMap);

    /**
     * Creates an array of the enumerable property names of the array-like `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @param {boolean} inherited Specify returning inherited property names.
     * @returns {Array} Returns the array of property names.
     */
    function arrayLikeKeys(value, inherited) {
      // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
      // Safari 9 makes `arguments.length` enumerable in strict mode.
      var result = (isArray(value) || isArguments(value))
        ? baseTimes(value.length, String)
        : [];

      var length = result.length,
          skipIndexes = !!length;

      for (var key in value) {
        if ((inherited || hasOwnProperty.call(value, key)) &&
            !(skipIndexes && (key == 'length' || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.clamp` which doesn't coerce arguments.
     *
     * @private
     * @param {number} number The number to clamp.
     * @param {number} [lower] The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the clamped number.
     */
    function baseClamp(number, lower, upper) {
      if (number === number) {
        if (upper !== undefined) {
          number = number <= upper ? number : upper;
        }
        if (lower !== undefined) {
          number = number >= lower ? number : lower;
        }
      }
      return number;
    }

    /**
     * The base implementation of `getTag`.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      return objectToString.call(value);
    }

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }

    /**
     * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != 'constructor') {
          result.push(key);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.random` without support for returning
     * floating-point numbers.
     *
     * @private
     * @param {number} lower The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the random number.
     */
    function baseRandom(lower, upper) {
      return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
    }

    /**
     * Copies the values of `source` to `array`.
     *
     * @private
     * @param {Array} source The array to copy values from.
     * @param {Array} [array=[]] The array to copy values to.
     * @returns {Array} Returns `array`.
     */
    function copyArray(source, array) {
      var index = -1,
          length = source.length;

      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : undefined;
    }

    /**
     * Gets the `toStringTag` of `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    var getTag = baseGetTag;

    // Fallback for data views, maps, sets, and weak maps in IE 11,
    // for data views in Edge < 14, and promises in Node.js.
    if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
        (Map$1 && getTag(new Map$1) != mapTag) ||
        (Promise$1 && getTag(Promise$1.resolve()) != promiseTag) ||
        (Set$1 && getTag(new Set$1) != setTag) ||
        (WeakMap && getTag(new WeakMap) != weakMapTag)) {
      getTag = function(value) {
        var result = objectToString.call(value),
            Ctor = result == objectTag ? value.constructor : undefined,
            ctorString = Ctor ? toSource(Ctor) : undefined;

        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString: return dataViewTag;
            case mapCtorString: return mapTag;
            case promiseCtorString: return promiseTag;
            case setCtorString: return setTag;
            case weakMapCtorString: return weakMapTag;
          }
        }
        return result;
      };
    }

    /**
     * Checks if `value` is a valid array-like index.
     *
     * @private
     * @param {*} value The value to check.
     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
     */
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length &&
        (typeof value == 'number' || reIsUint.test(value)) &&
        (value > -1 && value % 1 == 0 && value < length);
    }

    /**
     * Checks if the given arguments are from an iteratee call.
     *
     * @private
     * @param {*} value The potential iteratee value argument.
     * @param {*} index The potential iteratee index or key argument.
     * @param {*} object The potential iteratee object argument.
     * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
     *  else `false`.
     */
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == 'number'
            ? (isArrayLike(object) && isIndex(index, object.length))
            : (type == 'string' && index in object)
          ) {
        return eq(object[index], value);
      }
      return false;
    }

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    /**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */
    function isPrototype(value) {
      var Ctor = value && value.constructor,
          proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

      return value === proto;
    }

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to {"env":{"isProd":false}}.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {}
        try {
          return (func + '');
        } catch (e) {}
      }
      return '';
    }

    /**
     * Gets `n` random elements at unique keys from `collection` up to the
     * size of `collection`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to sample.
     * @param {number} [n=1] The number of elements to sample.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the random elements.
     * @example
     *
     * _.sampleSize([1, 2, 3], 2);
     * // => [3, 1]
     *
     * _.sampleSize([1, 2, 3], 4);
     * // => [2, 3, 1]
     */
    function sampleSize(collection, n, guard) {
      var index = -1,
          result = toArray(collection),
          length = result.length,
          lastIndex = length - 1;

      if ((guard ? isIterateeCall(collection, n, guard) : n === undefined)) {
        n = 1;
      } else {
        n = baseClamp(toInteger(n), 0, length);
      }
      while (++index < n) {
        var rand = baseRandom(index, lastIndex),
            value = result[rand];

        result[rand] = result[index];
        result[index] = value;
      }
      result.length = n;
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the
     * [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher-Yates_shuffle).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to shuffle.
     * @returns {Array} Returns the new shuffled array.
     * @example
     *
     * _.shuffle([1, 2, 3, 4]);
     * // => [4, 1, 3, 2]
     */
    function shuffle(collection) {
      return sampleSize(collection, MAX_ARRAY_LENGTH);
    }

    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
      return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
        (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
    }

    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray = Array.isArray;

    /**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }

    /**
     * This method is like `_.isArrayLike` except that it also checks if `value`
     * is an object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array-like object,
     *  else `false`.
     * @example
     *
     * _.isArrayLikeObject([1, 2, 3]);
     * // => true
     *
     * _.isArrayLikeObject(document.body.children);
     * // => true
     *
     * _.isArrayLikeObject('abc');
     * // => false
     *
     * _.isArrayLikeObject(_.noop);
     * // => false
     */
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 8-9 which returns 'object' for typed array and other constructors.
      var tag = isObject(value) ? objectToString.call(value) : '';
      return tag == funcTag || tag == genTag;
    }

    /**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This method is loosely based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
      return typeof value == 'number' &&
        value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function');
    }

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return !!value && typeof value == 'object';
    }

    /**
     * Checks if `value` is classified as a `String` primitive or object.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a string, else `false`.
     * @example
     *
     * _.isString('abc');
     * // => true
     *
     * _.isString(1);
     * // => false
     */
    function isString(value) {
      return typeof value == 'string' ||
        (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
    }

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike(value) && objectToString.call(value) == symbolTag);
    }

    /**
     * Converts `value` to an array.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {Array} Returns the converted array.
     * @example
     *
     * _.toArray({ 'a': 1, 'b': 2 });
     * // => [1, 2]
     *
     * _.toArray('abc');
     * // => ['a', 'b', 'c']
     *
     * _.toArray(1);
     * // => []
     *
     * _.toArray(null);
     * // => []
     */
    function toArray(value) {
      if (!value) {
        return [];
      }
      if (isArrayLike(value)) {
        return isString(value) ? stringToArray(value) : copyArray(value);
      }
      if (iteratorSymbol && value[iteratorSymbol]) {
        return iteratorToArray(value[iteratorSymbol]());
      }
      var tag = getTag(value),
          func = tag == mapTag ? mapToArray : (tag == setTag ? setToArray : values);

      return func(value);
    }

    /**
     * Converts `value` to a finite number.
     *
     * @static
     * @memberOf _
     * @since 4.12.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted number.
     * @example
     *
     * _.toFinite(3.2);
     * // => 3.2
     *
     * _.toFinite(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toFinite(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toFinite('3.2');
     * // => 3.2
     */
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = (value < 0 ? -1 : 1);
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }

    /**
     * Converts `value` to an integer.
     *
     * **Note:** This method is loosely based on
     * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toInteger(3.2);
     * // => 3
     *
     * _.toInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toInteger(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toInteger('3.2');
     * // => 3
     */
    function toInteger(value) {
      var result = toFinite(value),
          remainder = result % 1;

      return result === result ? (remainder ? result - remainder : result) : 0;
    }

    /**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to {"env":{"isProd":false}}.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3.2);
     * // => 3.2
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3.2');
     * // => 3.2
     */
    function toNumber(value) {
      if (typeof value == 'number') {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
        value = isObject(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, '');
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    /**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }

    /**
     * Creates an array of the own enumerable string keyed property values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.values(new Foo);
     * // => [1, 2] (iteration order is not guaranteed)
     *
     * _.values('hi');
     * // => ['h', 'i']
     */
    function values(object) {
      return object ? baseValues(object, keys(object)) : [];
    }

    var lodash_shuffle = shuffle;

    const EMPTY = -1;
    const ROWS = 4;
    const COLUMNS = 4;
    const SOLVED_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, -1];
    let timer;
    let dbSaveTimer;

    // temp
    const SOLVABLE_PUZZLE1 = [
      1,
      6,
      10,
      14,
      3,
      13,
      7,
      9,
      -1,
      12,
      8,
      4,
      15,
      2,
      11,
      5
    ];

    function getPuzzle() {
      let puzzle = lodash_shuffle(SOLVED_STATE);
      let count = 0;
      while (!isSolvable(puzzle) && count < 10) {
        puzzle = lodash_shuffle(SOLVED_STATE);
        count++;
      }
      if (count >= 10) {
        return SOLVABLE_PUZZLE1;
      } else {
        return puzzle;
      }
    }

    async function initGame() {
      const existingGame = await dbGet("game");
      if (existingGame && !isPuzzleSolved(existingGame.puzzle)) {
        puzzle.set(existingGame.puzzle);
        moves.set(existingGame.moves);
        time.set(existingGame.time);
        pauseGame();
      } else {
        startFirstGame();
      }
      return true;
    }

    function setupGame() {
      trackNewGame();
      puzzle.set(getPuzzle());
      moves.set(0);
      time.set(0);
      isSolved.set(false);
    }

    async function startFirstGame() {
      setupGame();
      isFirstGame.set(true);
    }

    function startSaveToDBTimer() {
      dbSaveTimer = setInterval(saveGameToDB, 30 * 1000);
    }

    async function startNewGame() {
      setupGame();

      isFirstGame.set(false);
      resumeGame();
      saveGameToDB();
    }

    function startTimer() {
      timer = setInterval(() => {
        time.update((time) => {
          return time + 1;
        });
      }, 1000);
    }

    function completeGame() {
      clearTimers();
      clearGameFromDB();
    }

    function clearTimers() {
      clearInterval(timer);
      clearInterval(dbSaveTimer);
    }

    function pauseGame() {
      clearTimers();
      paused.set(true);
      saveGameToDB();
    }

    function resumeGame() {
      if (timer || dbSaveTimer) {
        clearTimers();
      }
      startTimer();
      startSaveToDBTimer();
      paused.set(false);
    }

    function canMoveLeft(index, emptyCellIndex, colNumber) {
      return index - 1 === emptyCellIndex && colNumber !== 1;
    }

    function canMoveRight(index, emptyCellIndex, colNumber) {
      return index + 1 === emptyCellIndex && colNumber !== COLUMNS;
    }

    function canMoveUp(index, emptyCellIndex, rowNumber) {
      return index - COLUMNS === emptyCellIndex && rowNumber !== 1;
    }

    function canMoveDown(index, emptyCellIndex, rowNumber) {
      return index + COLUMNS === emptyCellIndex && rowNumber !== ROWS;
    }

    function canMove(index) {
      const emptyCell = get_store_value(emptyCellIndex);
      const cellNumber = index + 1;
      const rowNumber = Math.ceil(cellNumber / COLUMNS);
      const colNumber = cellNumber - (rowNumber - 1) * COLUMNS;

      if (rowNumber < 1 || rowNumber > ROWS) {
        return false;
      }

      if (colNumber < 1 || colNumber > COLUMNS) {
        return false;
      }

      return (
        canMoveLeft(index, emptyCell, colNumber) ||
        canMoveRight(index, emptyCell, colNumber) ||
        canMoveUp(index, emptyCell, rowNumber) ||
        canMoveDown(index, emptyCell, rowNumber)
      );
    }

    function clearGameFromDB() {
      dbSet("game", undefined);
    }

    function saveGameToDB() {
      const game = {
        puzzle: get_store_value(puzzle),
        moves: get_store_value(moves),
        time: get_store_value(time)
      };

      dbSet("game", { ...game });
    }

    function handleMove(indexToMove) {
      const isPaused = get_store_value(paused);
      if (isPaused) {
        return;
      }
      if (!timer) {
        resumeGame();
      }
      const currentPuzzle = get_store_value(puzzle);
      if (isPuzzleSolved(currentPuzzle)) {
        return;
      }
      if (!canMove(indexToMove)) {
        return;
      }
      const numberToMove = currentPuzzle[indexToMove];
      const updatedPuzzle = currentPuzzle.map((number, index) => {
        if (index === indexToMove) {
          return -1;
        } else if (number === -1) {
          return numberToMove;
        }
        return number;
      });
      puzzle.set(updatedPuzzle);
      moves.update((moves) => moves + 1);
      saveGameToDB();
      if (isPuzzleSolved(updatedPuzzle)) {
        trackSolvedPuzzle();
        isSolved.set(true);
      }
    }

    // https://stackoverflow.com/a/34570524/1288404
    function isSolvable(puzzle) {
      let inversions = 0;
      let gridWidth = Math.sqrt(puzzle.length);
      let row = 0;
      let rowWithEmptyCell = 0;

      for (let i = 0; i < puzzle.length; i++) {
        if (i % gridWidth === 0) {
          row++;
        }

        if (puzzle[i] === EMPTY) {
          rowWithEmptyCell = row;
          continue;
        }

        for (let j = i + 1; j < puzzle.length; j++) {
          if (puzzle[i] > puzzle[j] && puzzle[j] !== EMPTY) {
            inversions++;
          }
        }
      }

      if (rowWithEmptyCell % 2 === 0) {
        return inversions % 2 === 0;
      } else {
        return inversions % 2 !== 0;
      }
    }

    function isPuzzleSolved(puzzle) {
      for (let i = 0; i < puzzle.length - 1; i++) {
        if (puzzle[i] !== i + 1) {
          return false;
        }
      }
      return true;
    }

    const paused = writable(false);
    const moves = writable(0);
    const time = writable(0);
    const puzzle = writable([]);
    const isSolved = writable(false);
    const isFirstGame = writable(false);

    const emptyCellIndex = derived(puzzle, ($puzzle) =>
      $puzzle.indexOf(EMPTY)
    );

    const minutesString = derived(time, ($time) => {
      const minutes = Math.floor($time / 60);
      return String(minutes).padStart(2, "0");
    });

    const secondsString = derived(time, ($time) => {
      const seconds = $time % 60;
      return String(seconds).padStart(2, "0");
    });

    function trackNewGame() {
      if (window.ga !== undefined) {
        ga("send", {
          hitType: "event",
          eventCategory: "Game",
          eventAction: "New Game",
          eventLabel: "New Game",
          eventValue: get_store_value(time)
        });
      }
    }

    function trackSolvedPuzzle() {
      if (window.ga !== undefined) {
        ga("send", {
          hitType: "event",
          eventCategory: "Game",
          eventAction: "Solved",
          eventLabel: "Solved",
          eventValue: get_store_value(time)
        });
      }
    }

    function trackShare() {
      if (window.ga !== undefined) {
        ga("send", {
          hitType: "event",
          eventCategory: "Share",
          eventAction: "Shared",
          eventLabel: "Shared"
        });
      }
    }

    function trackInstall() {
      if (window.ga !== undefined) {
        ga("send", {
          hitType: "event",
          eventCategory: "App",
          eventAction: "Install"
        });
      }
    }

    try{self["workbox:window:5.1.3"]&&_();}catch(n){}function n(n,t){return new Promise((function(r){var i=new MessageChannel;i.port1.onmessage=function(n){r(n.data);},n.postMessage(t,[i.port2]);}))}function t(n,t){for(var r=0;r<t.length;r++){var i=t[r];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(n,i.key,i);}}try{self["workbox:core:5.1.3"]&&_();}catch(n){}var r=function(){var n=this;this.promise=new Promise((function(t,r){n.resolve=t,n.reject=r;}));};function i(n,t){var r=location.href;return new URL(n,r).href===new URL(t,r).href}var e=function(n,t){this.type=n,Object.assign(this,t);};function o(n,t,r){return r?t?t(n):n:(n&&n.then||(n=Promise.resolve(n)),t?n.then(t):n)}function u(){}var a=function(u){var a,f;function s(n,t){var a,c;return void 0===t&&(t={}),(a=u.call(this)||this).t={},a.i=0,a.o=new r,a.u=new r,a.s=new r,a.v=0,a.h=new Set,a.l=function(){var n=a.g,t=n.installing;a.i>0||!i(t.scriptURL,a.m)||performance.now()>a.v+6e4?(a.P=t,n.removeEventListener("updatefound",a.l)):(a.p=t,a.h.add(t),a.o.resolve(t)),++a.i,t.addEventListener("statechange",a.k);},a.k=function(n){var t=a.g,r=n.target,i=r.state,o=r===a.P,u=o?"external":"",c={sw:r,originalEvent:n};!o&&a.j&&(c.isUpdate=!0),a.dispatchEvent(new e(u+i,c)),"installed"===i?a.O=self.setTimeout((function(){"installed"===i&&t.waiting===r&&a.dispatchEvent(new e(u+"waiting",c));}),200):"activating"===i&&(clearTimeout(a.O),o||a.u.resolve(r));},a.R=function(n){var t=a.p;t===navigator.serviceWorker.controller&&(a.dispatchEvent(new e("controlling",{sw:t,originalEvent:n,isUpdate:a.j})),a.s.resolve(t));},a.S=(c=function(n){var t=n.data,r=n.source;return o(a.getSW(),(function(){a.h.has(r)&&a.dispatchEvent(new e("message",{data:t,sw:r,originalEvent:n}));}))},function(){for(var n=[],t=0;t<arguments.length;t++)n[t]=arguments[t];try{return Promise.resolve(c.apply(this,n))}catch(n){return Promise.reject(n)}}),a.m=n,a.t=t,navigator.serviceWorker.addEventListener("message",a.S),a}f=u,(a=s).prototype=Object.create(f.prototype),a.prototype.constructor=a,a.__proto__=f;var v,h,l=s.prototype;return l.register=function(n){var t=(void 0===n?{}:n).immediate,r=void 0!==t&&t;try{var u=this;return function(n,t){var r=n();if(r&&r.then)return r.then(t);return t(r)}((function(){if(!r&&"complete"!==document.readyState)return c(new Promise((function(n){return window.addEventListener("load",n)})))}),(function(){return u.j=Boolean(navigator.serviceWorker.controller),u.U=u.B(),o(u.L(),(function(n){u.g=n,u.U&&(u.p=u.U,u.u.resolve(u.U),u.s.resolve(u.U),u.U.addEventListener("statechange",u.k,{once:!0}));var t=u.g.waiting;return t&&i(t.scriptURL,u.m)&&(u.p=t,Promise.resolve().then((function(){u.dispatchEvent(new e("waiting",{sw:t,wasWaitingBeforeRegister:!0}));})).then((function(){}))),u.p&&(u.o.resolve(u.p),u.h.add(u.p)),u.g.addEventListener("updatefound",u.l),navigator.serviceWorker.addEventListener("controllerchange",u.R,{once:!0}),u.g}))}))}catch(n){return Promise.reject(n)}},l.update=function(){try{return this.g?c(this.g.update()):void 0}catch(n){return Promise.reject(n)}},l.getSW=function(){try{return void 0!==this.p?this.p:this.o.promise}catch(n){return Promise.reject(n)}},l.messageSW=function(t){try{return o(this.getSW(),(function(r){return n(r,t)}))}catch(n){return Promise.reject(n)}},l.B=function(){var n=navigator.serviceWorker.controller;return n&&i(n.scriptURL,this.m)?n:void 0},l.L=function(){try{var n=this;return function(n,t){try{var r=n();}catch(n){return t(n)}if(r&&r.then)return r.then(void 0,t);return r}((function(){return o(navigator.serviceWorker.register(n.m,n.t),(function(t){return n.v=performance.now(),t}))}),(function(n){throw n}))}catch(n){return Promise.reject(n)}},v=s,(h=[{key:"active",get:function(){return this.u.promise}},{key:"controlling",get:function(){return this.s.promise}}])&&t(v.prototype,h),s}(function(){function n(){this.M=new Map;}var t=n.prototype;return t.addEventListener=function(n,t){this._(n).add(t);},t.removeEventListener=function(n,t){this._(n).delete(t);},t.dispatchEvent=function(n){n.target=this;var t=this._(n.type),r=Array.isArray(t),i=0;for(t=r?t:t[Symbol.iterator]();;){var e;if(r){if(i>=t.length)break;e=t[i++];}else {if((i=t.next()).done)break;e=i.value;}e(n);}},t._=function(n){return this.M.has(n)||this.M.set(n,new Set),this.M.get(n)},n}());function c(n,t){if(!t)return n&&n.then?n.then(u):Promise.resolve()}

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/components/ServiceWorker.svelte generated by Svelte v3.21.0 */
    const file$1 = "src/components/ServiceWorker.svelte";

    // (88:0) {#if showRefreshPrompt}
    function create_if_block(ctx) {
    	let div;
    	let span;
    	let t1;
    	let button;
    	let div_intro;
    	let div_outro;
    	let current;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "There's a new version of this app.";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Update";
    			add_location(span, file$1, 92, 4, 2115);
    			attr_dev(button, "class", "refresh-prompt-button svelte-1g6pgh2");
    			add_location(button, file$1, 93, 4, 2167);
    			attr_dev(div, "class", "refresh-prompt svelte-1g6pgh2");
    			add_location(div, file$1, 88, 2, 1999);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(div, t1);
    			append_dev(div, button);
    			current = true;
    			if (remount) dispose();

    			dispose = listen_dev(
    				button,
    				"click",
    				function () {
    					if (is_function(/*onAcceptRefresh*/ ctx[1])) /*onAcceptRefresh*/ ctx[1].apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { y: 100, duration: 300 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fly, { y: 100, duration: 300 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(88:0) {#if showRefreshPrompt}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*showRefreshPrompt*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showRefreshPrompt*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showRefreshPrompt*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let showRefreshPrompt = false;
    	let onAcceptRefresh;

    	onMount(() => {
    		registerSW();

    		window.addEventListener("appinstalled", () => {
    			trackInstall();
    		});
    	});

    	function createUIPrompt({ onAccept, onReject }) {
    		$$invalidate(1, onAcceptRefresh = onAccept);
    		$$invalidate(0, showRefreshPrompt = true);
    	}

    	function refresh() {
    		if (typeof onAcceptRefresh === "function") {
    			onAcceptRefresh();
    			$$invalidate(0, showRefreshPrompt = false);
    		}
    	}

    	function registerSW() {
    		if ("serviceWorker" in navigator) {
    			const wb = new a("/sw.js");

    			const showSkipWaitingPrompt = event => {
    				const prompt = createUIPrompt({
    					onAccept: async () => {
    						wb.addEventListener("controlling", event => {
    							window.location.reload();
    						});

    						n(event.sw, { type: "SKIP_WAITING" });
    					},
    					onReject: () => {
    						prompt.dismiss();
    					}
    				});
    			};

    			wb.addEventListener("waiting", showSkipWaitingPrompt);
    			wb.addEventListener("externalwaiting", showSkipWaitingPrompt);
    			wb.register();
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ServiceWorker> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ServiceWorker", $$slots, []);

    	$$self.$capture_state = () => ({
    		trackInstall,
    		Workbox: a,
    		messageSW: n,
    		fly,
    		onMount,
    		showRefreshPrompt,
    		onAcceptRefresh,
    		createUIPrompt,
    		refresh,
    		registerSW
    	});

    	$$self.$inject_state = $$props => {
    		if ("showRefreshPrompt" in $$props) $$invalidate(0, showRefreshPrompt = $$props.showRefreshPrompt);
    		if ("onAcceptRefresh" in $$props) $$invalidate(1, onAcceptRefresh = $$props.onAcceptRefresh);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [showRefreshPrompt, onAcceptRefresh];
    }

    class ServiceWorker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ServiceWorker",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/Loading.svelte generated by Svelte v3.21.0 */

    const file$2 = "src/components/Loading.svelte";

    function create_fragment$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Loading...";
    			attr_dev(div, "class", "loading svelte-ibnt0n");
    			add_location(div, file$2, 10, 0, 143);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Loading> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Loading", $$slots, []);
    	return [];
    }

    class Loading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loading",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/VisibilityHandler.svelte generated by Svelte v3.21.0 */

    function create_fragment$3(ctx) {
    	let dispose;

    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			if (remount) dispose();
    			dispose = listen_dev(window, "visibilitychange", /*handleVisibilityChange*/ ctx[0], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $time;
    	let $moves;
    	let $paused;
    	validate_store(time, "time");
    	component_subscribe($$self, time, $$value => $$invalidate(1, $time = $$value));
    	validate_store(moves, "moves");
    	component_subscribe($$self, moves, $$value => $$invalidate(2, $moves = $$value));
    	validate_store(paused, "paused");
    	component_subscribe($$self, paused, $$value => $$invalidate(3, $paused = $$value));

    	function handleVisibilityChange() {
    		if (document.hidden) {
    			if (($time > 0 || $moves > 0) && $paused === false) {
    				pauseGame();
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<VisibilityHandler> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("VisibilityHandler", $$slots, []);

    	$$self.$capture_state = () => ({
    		time,
    		moves,
    		paused,
    		pauseGame,
    		handleVisibilityChange,
    		$time,
    		$moves,
    		$paused
    	});

    	return [handleVisibilityChange];
    }

    class VisibilityHandler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "VisibilityHandler",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/KeyboardHandler.svelte generated by Svelte v3.21.0 */

    function create_fragment$4(ctx) {
    	let dispose;

    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			if (remount) dispose();
    			dispose = listen_dev(window, "keydown", /*handleKeydown*/ ctx[0], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $emptyCellIndex;
    	validate_store(emptyCellIndex, "emptyCellIndex");
    	component_subscribe($$self, emptyCellIndex, $$value => $$invalidate(1, $emptyCellIndex = $$value));

    	function handleKeydown(event) {
    		event.preventDefault();
    		const key = event.code;

    		switch (key) {
    			case "ArrowLeft":
    				handleMove($emptyCellIndex + 1);
    				return;
    			case "ArrowRight":
    				handleMove($emptyCellIndex - 1);
    				return;
    			case "ArrowDown":
    				handleMove($emptyCellIndex - COLUMNS);
    				return;
    			case "ArrowUp":
    				handleMove($emptyCellIndex + COLUMNS);
    				return;
    			default:
    				return;
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<KeyboardHandler> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("KeyboardHandler", $$slots, []);

    	$$self.$capture_state = () => ({
    		handleMove,
    		COLUMNS,
    		pauseGame,
    		resumeGame,
    		emptyCellIndex,
    		paused,
    		handleKeydown,
    		$emptyCellIndex
    	});

    	return [handleKeydown];
    }

    class KeyboardHandler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "KeyboardHandler",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    // canvas-confetti v1.2.0 built on 2020-04-03T22:26:09.865Z
    var module = {};

    // source content
    (function main(global, module, isWorker, workerSize) {
      var canUseWorker = !!(
        global.Worker &&
        global.Blob &&
        global.Promise &&
        global.OffscreenCanvas &&
        global.HTMLCanvasElement &&
        global.HTMLCanvasElement.prototype.transferControlToOffscreen &&
        global.URL &&
        global.URL.createObjectURL);

      function noop() {}

      // create a promise if it exists, otherwise, just
      // call the function directly
      function promise(func) {
        var ModulePromise = module.exports.Promise;
        var Prom = ModulePromise !== void 0 ? ModulePromise : global.Promise;

        if (typeof Prom === 'function') {
          return new Prom(func);
        }

        func(noop, noop);

        return null;
      }

      var raf = (function () {
        var TIME = Math.floor(1000 / 60);
        var frame, cancel;
        var frames = {};
        var lastFrameTime = 0;

        if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
          frame = function (cb) {
            var id = Math.random();

            frames[id] = requestAnimationFrame(function onFrame(time) {
              if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
                lastFrameTime = time;
                delete frames[id];

                cb();
              } else {
                frames[id] = requestAnimationFrame(onFrame);
              }
            });

            return id;
          };
          cancel = function (id) {
            if (frames[id]) {
              cancelAnimationFrame(frames[id]);
            }
          };
        } else {
          frame = function (cb) {
            return setTimeout(cb, TIME);
          };
          cancel = function (timer) {
            return clearTimeout(timer);
          };
        }

        return { frame: frame, cancel: cancel };
      }());

      var getWorker = (function () {
        var worker;
        var prom;
        var resolves = {};

        function decorate(worker) {
          function execute(options, callback) {
            worker.postMessage({ options: options || {}, callback: callback });
          }
          worker.init = function initWorker(canvas) {
            var offscreen = canvas.transferControlToOffscreen();
            worker.postMessage({ canvas: offscreen }, [offscreen]);
          };

          worker.fire = function fireWorker(options, size, done) {
            if (prom) {
              execute(options, null);
              return prom;
            }

            var id = Math.random().toString(36).slice(2);

            prom = promise(function (resolve) {
              function workerDone(msg) {
                if (msg.data.callback !== id) {
                  return;
                }

                delete resolves[id];
                worker.removeEventListener('message', workerDone);

                prom = null;
                done();
                resolve();
              }

              worker.addEventListener('message', workerDone);
              execute(options, id);

              resolves[id] = workerDone.bind(null, { data: { callback: id }});
            });

            return prom;
          };

          worker.reset = function resetWorker() {
            worker.postMessage({ reset: true });

            for (var id in resolves) {
              resolves[id]();
              delete resolves[id];
            }
          };
        }

        return function () {
          if (worker) {
            return worker;
          }

          if (!isWorker && canUseWorker) {
            var code = [
              'var CONFETTI, SIZE = {}, module = {};',
              '(' + main.toString() + ')(this, module, true, SIZE);',
              'onmessage = function(msg) {',
              '  if (msg.data.options) {',
              '    CONFETTI(msg.data.options).then(function () {',
              '      if (msg.data.callback) {',
              '        postMessage({ callback: msg.data.callback });',
              '      }',
              '    });',
              '  } else if (msg.data.reset) {',
              '    CONFETTI.reset();',
              '  } else if (msg.data.resize) {',
              '    SIZE.width = msg.data.resize.width;',
              '    SIZE.height = msg.data.resize.height;',
              '  } else if (msg.data.canvas) {',
              '    SIZE.width = msg.data.canvas.width;',
              '    SIZE.height = msg.data.canvas.height;',
              '    CONFETTI = module.exports.create(msg.data.canvas);',
              '  }',
              '}',
            ].join('\n');
            try {
              worker = new Worker(URL.createObjectURL(new Blob([code])));
            } catch (e) {
              // eslint-disable-next-line no-console
              typeof console !== undefined && typeof console.warn === 'function' ? console.warn('🎊 Count not load worker', e) : null;

              return null;
            }

            decorate(worker);
          }

          return worker;
        };
      })();

      var defaults = {
        particleCount: 50,
        angle: 90,
        spread: 45,
        startVelocity: 45,
        decay: 0.9,
        gravity: 1,
        ticks: 200,
        x: 0.5,
        y: 0.5,
        shapes: ['square', 'circle'],
        zIndex: 100,
        colors: [
          '#26ccff',
          '#a25afd',
          '#ff5e7e',
          '#88ff5a',
          '#fcff42',
          '#ffa62d',
          '#ff36ff'
        ],
        // probably should be true, but back-compat
        disableForReducedMotion: false
      };

      function convert(val, transform) {
        return transform ? transform(val) : val;
      }

      function isOk(val) {
        return !(val === null || val === undefined);
      }

      function prop(options, name, transform) {
        return convert(
          options && isOk(options[name]) ? options[name] : defaults[name],
          transform
        );
      }

      function randomInt(min, max) {
        // [min, max)
        return Math.floor(Math.random() * (max - min)) + min;
      }

      function toDecimal(str) {
        return parseInt(str, 16);
      }

      function hexToRgb(str) {
        var val = String(str).replace(/[^0-9a-f]/gi, '');

        if (val.length < 6) {
            val = val[0]+val[0]+val[1]+val[1]+val[2]+val[2];
        }

        return {
          r: toDecimal(val.substring(0,2)),
          g: toDecimal(val.substring(2,4)),
          b: toDecimal(val.substring(4,6))
        };
      }

      function getOrigin(options) {
        var origin = prop(options, 'origin', Object);
        origin.x = prop(origin, 'x', Number);
        origin.y = prop(origin, 'y', Number);

        return origin;
      }

      function setCanvasWindowSize(canvas) {
        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;
      }

      function setCanvasRectSize(canvas) {
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      function getCanvas(zIndex) {
        var canvas = document.createElement('canvas');

        canvas.style.position = 'fixed';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = zIndex;

        return canvas;
      }

      function ellipse(context, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise) {
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.scale(radiusX, radiusY);
        context.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
        context.restore();
      }

      function randomPhysics(opts) {
        var radAngle = opts.angle * (Math.PI / 180);
        var radSpread = opts.spread * (Math.PI / 180);

        return {
          x: opts.x,
          y: opts.y,
          wobble: Math.random() * 10,
          velocity: (opts.startVelocity * 0.5) + (Math.random() * opts.startVelocity),
          angle2D: -radAngle + ((0.5 * radSpread) - (Math.random() * radSpread)),
          tiltAngle: Math.random() * Math.PI,
          color: hexToRgb(opts.color),
          shape: opts.shape,
          tick: 0,
          totalTicks: opts.ticks,
          decay: opts.decay,
          random: Math.random() + 5,
          tiltSin: 0,
          tiltCos: 0,
          wobbleX: 0,
          wobbleY: 0,
          gravity: opts.gravity * 3,
          ovalScalar: 0.6
        };
      }

      function updateFetti(context, fetti) {
        fetti.x += Math.cos(fetti.angle2D) * fetti.velocity;
        fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity;
        fetti.wobble += 0.1;
        fetti.velocity *= fetti.decay;
        fetti.tiltAngle += 0.1;
        fetti.tiltSin = Math.sin(fetti.tiltAngle);
        fetti.tiltCos = Math.cos(fetti.tiltAngle);
        fetti.random = Math.random() + 5;
        fetti.wobbleX = fetti.x + (10 * Math.cos(fetti.wobble));
        fetti.wobbleY = fetti.y + (10 * Math.sin(fetti.wobble));

        var progress = (fetti.tick++) / fetti.totalTicks;

        var x1 = fetti.x + (fetti.random * fetti.tiltCos);
        var y1 = fetti.y + (fetti.random * fetti.tiltSin);
        var x2 = fetti.wobbleX + (fetti.random * fetti.tiltCos);
        var y2 = fetti.wobbleY + (fetti.random * fetti.tiltSin);

        context.fillStyle = 'rgba(' + fetti.color.r + ', ' + fetti.color.g + ', ' + fetti.color.b + ', ' + (1 - progress) + ')';
        context.beginPath();

        if (fetti.shape === 'circle') {
          context.ellipse ?
            context.ellipse(fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI) :
            ellipse(context, fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI);
        } else {
          context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
          context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1));
          context.lineTo(Math.floor(x2), Math.floor(y2));
          context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY));
        }

        context.closePath();
        context.fill();

        return fetti.tick < fetti.totalTicks;
      }

      function animate(canvas, fettis, resizer, size, done) {
        var animatingFettis = fettis.slice();
        var context = canvas.getContext('2d');
        var animationFrame;
        var destroy;

        var prom = promise(function (resolve) {
          function onDone() {
            animationFrame = destroy = null;

            context.clearRect(0, 0, size.width, size.height);

            done();
            resolve();
          }

          function update() {
            if (isWorker && !(size.width === workerSize.width && size.height === workerSize.height)) {
              size.width = canvas.width = workerSize.width;
              size.height = canvas.height = workerSize.height;
            }

            if (!size.width && !size.height) {
              resizer(canvas);
              size.width = canvas.width;
              size.height = canvas.height;
            }

            context.clearRect(0, 0, size.width, size.height);

            animatingFettis = animatingFettis.filter(function (fetti) {
              return updateFetti(context, fetti);
            });

            if (animatingFettis.length) {
              animationFrame = raf.frame(update);
            } else {
              onDone();
            }
          }

          animationFrame = raf.frame(update);
          destroy = onDone;
        });

        return {
          addFettis: function (fettis) {
            animatingFettis = animatingFettis.concat(fettis);

            return prom;
          },
          canvas: canvas,
          promise: prom,
          reset: function () {
            if (animationFrame) {
              raf.cancel(animationFrame);
            }

            if (destroy) {
              destroy();
            }
          }
        };
      }

      function confettiCannon(canvas, globalOpts) {
        var isLibCanvas = !canvas;
        var allowResize = !!prop(globalOpts || {}, 'resize');
        var globalDisableForReducedMotion = prop(globalOpts, 'disableForReducedMotion', Boolean);
        var shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, 'useWorker');
        var worker = shouldUseWorker ? getWorker() : null;
        var resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize;
        var initialized = (canvas && worker) ? !!canvas.__confetti_initialized : false;
        var preferLessMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion)').matches;
        var animationObj;

        function fireLocal(options, size, done) {
          var particleCount = prop(options, 'particleCount', Math.floor);
          var angle = prop(options, 'angle', Number);
          var spread = prop(options, 'spread', Number);
          var startVelocity = prop(options, 'startVelocity', Number);
          var decay = prop(options, 'decay', Number);
          var gravity = prop(options, 'gravity', Number);
          var colors = prop(options, 'colors');
          var ticks = prop(options, 'ticks', Number);
          var shapes = prop(options, 'shapes');
          var origin = getOrigin(options);

          var temp = particleCount;
          var fettis = [];

          var startX = canvas.width * origin.x;
          var startY = canvas.height * origin.y;

          while (temp--) {
            fettis.push(
              randomPhysics({
                x: startX,
                y: startY,
                angle: angle,
                spread: spread,
                startVelocity: startVelocity,
                color: colors[temp % colors.length],
                shape: shapes[randomInt(0, shapes.length)],
                ticks: ticks,
                decay: decay,
                gravity: gravity
              })
            );
          }

          // if we have a previous canvas already animating,
          // add to it
          if (animationObj) {
            return animationObj.addFettis(fettis);
          }

          animationObj = animate(canvas, fettis, resizer, size , done);

          return animationObj.promise;
        }

        function fire(options) {
          var disableForReducedMotion = globalDisableForReducedMotion || prop(options, 'disableForReducedMotion', Boolean);
          var zIndex = prop(options, 'zIndex', Number);

          if (disableForReducedMotion && preferLessMotion) {
            return promise(function (resolve) {
              resolve();
            });
          }

          if (isLibCanvas && animationObj) {
            // use existing canvas from in-progress animation
            canvas = animationObj.canvas;
          } else if (isLibCanvas && !canvas) {
            // create and initialize a new canvas
            canvas = getCanvas(zIndex);
            document.body.appendChild(canvas);
          }

          if (allowResize && !initialized) {
            // initialize the size of a user-supplied canvas
            resizer(canvas);
          }

          var size = {
            width: canvas.width,
            height: canvas.height
          };

          if (worker && !initialized) {
            worker.init(canvas);
          }

          initialized = true;

          if (worker) {
            canvas.__confetti_initialized = true;
          }

          function onResize() {
            if (worker) {
              // TODO this really shouldn't be immediate, because it is expensive
              var obj = {
                getBoundingClientRect: function () {
                  if (!isLibCanvas) {
                    return canvas.getBoundingClientRect();
                  }
                }
              };

              resizer(obj);

              worker.postMessage({
                resize: {
                  width: obj.width,
                  height: obj.height
                }
              });
              return;
            }

            // don't actually query the size here, since this
            // can execute frequently and rapidly
            size.width = size.height = null;
          }

          function done() {
            animationObj = null;

            if (allowResize) {
              global.removeEventListener('resize', onResize);
            }

            if (isLibCanvas && canvas) {
              document.body.removeChild(canvas);
              canvas = null;
              initialized = false;
            }
          }

          if (allowResize) {
            global.addEventListener('resize', onResize, false);
          }

          if (worker) {
            return worker.fire(options, size, done);
          }

          return fireLocal(options, size, done);
        }

        fire.reset = function () {
          if (worker) {
            worker.reset();
          }

          if (animationObj) {
            animationObj.reset();
          }
        };

        return fire;
      }

      module.exports = confettiCannon(null, { useWorker: true, resize: true });
      module.exports.create = confettiCannon;
    }((function () {
      if (typeof window !== 'undefined') {
        return window;
      }

      if (typeof self !== 'undefined') {
        return self;
      }

      return this;
    })(), module, false));

    // end source content

    var confetti = module.exports;
    var create = module.exports.create;

    /* src/components/Button.svelte generated by Svelte v3.21.0 */

    const file$3 = "src/components/Button.svelte";

    function create_fragment$5(ctx) {
    	let button;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "btn svelte-1q8f1f6");
    			add_location(button, file$3, 23, 0, 424);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    			if (remount) dispose();

    			dispose = listen_dev(
    				button,
    				"click",
    				function () {
    					if (is_function(/*onClick*/ ctx[0])) /*onClick*/ ctx[0].apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { onClick } = $$props;
    	const writable_props = ["onClick"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Button", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("onClick" in $$props) $$invalidate(0, onClick = $$props.onClick);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ onClick });

    	$$self.$inject_state = $$props => {
    		if ("onClick" in $$props) $$invalidate(0, onClick = $$props.onClick);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [onClick, $$scope, $$slots];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { onClick: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onClick*/ ctx[0] === undefined && !("onClick" in props)) {
    			console.warn("<Button> was created without expected prop 'onClick'");
    		}
    	}

    	get onClick() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClick(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/PuzzleComplete.svelte generated by Svelte v3.21.0 */

    const { console: console_1 } = globals;
    const file$4 = "src/components/PuzzleComplete.svelte";

    // (108:0) {#if showOverlay}
    function create_if_block$1(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5_value = (/*$moves*/ ctx[2] === 1 ? "move" : "moves") + "";
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let current;
    	let if_block = /*showShareButton*/ ctx[4] && create_if_block_1(ctx);

    	const button = new Button({
    			props: {
    				onClick: /*newGame*/ ctx[3],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text("Woo-hoo! You solved the puzzle in ");
    			t1 = text(/*gameCompletionTime*/ ctx[1]);
    			t2 = text(" using ");
    			t3 = text(/*$moves*/ ctx[2]);
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = text("\n      🎉🎉🎉");
    			t7 = space();
    			if (if_block) if_block.c();
    			t8 = space();
    			create_component(button.$$.fragment);
    			attr_dev(div0, "class", "success-content svelte-1v7ndjb");
    			add_location(div0, file$4, 109, 4, 2459);
    			attr_dev(div1, "class", "solved-overlay svelte-1v7ndjb");
    			add_location(div1, file$4, 108, 2, 2426);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, t4);
    			append_dev(div0, t5);
    			append_dev(div0, t6);
    			append_dev(div1, t7);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t8);
    			mount_component(button, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*gameCompletionTime*/ 2) set_data_dev(t1, /*gameCompletionTime*/ ctx[1]);
    			if (!current || dirty & /*$moves*/ 4) set_data_dev(t3, /*$moves*/ ctx[2]);
    			if ((!current || dirty & /*$moves*/ 4) && t5_value !== (t5_value = (/*$moves*/ ctx[2] === 1 ? "move" : "moves") + "")) set_data_dev(t5, t5_value);
    			if (/*showShareButton*/ ctx[4]) if_block.p(ctx, dirty);
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(108:0) {#if showOverlay}",
    		ctx
    	});

    	return block;
    }

    // (114:4) {#if showShareButton}
    function create_if_block_1(ctx) {
    	let current;

    	const button = new Button({
    			props: {
    				onClick: /*share*/ ctx[5],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(114:4) {#if showShareButton}",
    		ctx
    	});

    	return block;
    }

    // (115:6) <Button onClick={share}>
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Tell the World!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(115:6) <Button onClick={share}>",
    		ctx
    	});

    	return block;
    }

    // (117:4) <Button onClick={newGame}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Start New Game");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(117:4) <Button onClick={newGame}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*showOverlay*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showOverlay*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showOverlay*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function boom() {
    	confetti({
    		particleCount: 100,
    		disableForReducedMotion: true,
    		angle: 45,
    		origin: { x: 0, y: 0.5 }
    	});

    	confetti({
    		particleCount: 100,
    		disableForReducedMotion: true,
    		angle: 135,
    		origin: { x: 1, y: 0.5 }
    	});
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $moves;
    	let $time;
    	validate_store(moves, "moves");
    	component_subscribe($$self, moves, $$value => $$invalidate(2, $moves = $$value));
    	validate_store(time, "time");
    	component_subscribe($$self, time, $$value => $$invalidate(7, $time = $$value));
    	let showOverlay = false;
    	let gameCompletionTime = "";
    	let { onNewGame } = $$props;

    	function newGame() {
    		$$invalidate(0, showOverlay = false);
    		onNewGame();
    	}

    	const showShareButton = Boolean(navigator.share);

    	function share() {
    		if (navigator.share) {
    			const moveText = $moves === 1 ? "move" : "moves";

    			navigator.share({
    				title: "15 Puzzle",
    				text: `Woo-hoo! I solved a 15 Puzzle in ${gameCompletionTime} using ${$moves} ${moveText} 🎉🎉🎉`,
    				url: "https://15puzzle-sigma.vercel.app/"
    			}).then(trackShare).catch(error => console.log("Error sharing", error));
    		} else {
    			console.log("NO SHARE");
    		}
    	}

    	function setGameCompletionTime() {
    		$$invalidate(1, gameCompletionTime = "");
    		const minutes = Math.floor($time / 60);
    		const seconds = $time % 60;

    		if (minutes && minutes === 1) {
    			$$invalidate(1, gameCompletionTime = "1 minute ");
    		} else if (minutes > 1) {
    			$$invalidate(1, gameCompletionTime = `${minutes} minutes `);
    		}

    		if (seconds === 1) {
    			$$invalidate(1, gameCompletionTime += "1 second");
    		} else if (seconds > 1) {
    			$$invalidate(1, gameCompletionTime += `${seconds} seconds`);
    		}
    	}

    	const unsubscribe = isSolved.subscribe(solved => {
    		if (solved) {
    			completeGame();
    			setGameCompletionTime();
    			$$invalidate(0, showOverlay = true);
    			boom();
    		}
    	});

    	onDestroy(unsubscribe);
    	const writable_props = ["onNewGame"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<PuzzleComplete> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("PuzzleComplete", $$slots, []);

    	$$self.$set = $$props => {
    		if ("onNewGame" in $$props) $$invalidate(6, onNewGame = $$props.onNewGame);
    	};

    	$$self.$capture_state = () => ({
    		completeGame,
    		trackShare,
    		isSolved,
    		moves,
    		time,
    		confetti,
    		Button,
    		onDestroy,
    		showOverlay,
    		gameCompletionTime,
    		onNewGame,
    		newGame,
    		showShareButton,
    		share,
    		setGameCompletionTime,
    		boom,
    		unsubscribe,
    		$moves,
    		$time
    	});

    	$$self.$inject_state = $$props => {
    		if ("showOverlay" in $$props) $$invalidate(0, showOverlay = $$props.showOverlay);
    		if ("gameCompletionTime" in $$props) $$invalidate(1, gameCompletionTime = $$props.gameCompletionTime);
    		if ("onNewGame" in $$props) $$invalidate(6, onNewGame = $$props.onNewGame);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showOverlay,
    		gameCompletionTime,
    		$moves,
    		newGame,
    		showShareButton,
    		share,
    		onNewGame
    	];
    }

    class PuzzleComplete extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { onNewGame: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PuzzleComplete",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onNewGame*/ ctx[6] === undefined && !("onNewGame" in props)) {
    			console_1.warn("<PuzzleComplete> was created without expected prop 'onNewGame'");
    		}
    	}

    	get onNewGame() {
    		throw new Error("<PuzzleComplete>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onNewGame(value) {
    		throw new Error("<PuzzleComplete>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/PuzzleActions.svelte generated by Svelte v3.21.0 */
    const file$5 = "src/components/PuzzleActions.svelte";

    // (18:2) <Button onClick={onStartNewGame}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("New Game");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(18:2) <Button onClick={onStartNewGame}>",
    		ctx
    	});

    	return block;
    }

    // (21:2) {:else}
    function create_else_block(ctx) {
    	let current;

    	const button = new Button({
    			props: {
    				onClick: pauseGame,
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(21:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (19:2) {#if $paused}
    function create_if_block$2(ctx) {
    	let current;

    	const button = new Button({
    			props: {
    				onClick: resumeGame,
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(19:2) {#if $paused}",
    		ctx
    	});

    	return block;
    }

    // (22:4) <Button onClick={pauseGame}>
    function create_default_slot_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pause");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(22:4) <Button onClick={pauseGame}>",
    		ctx
    	});

    	return block;
    }

    // (20:4) <Button onClick={resumeGame}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Resume");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(20:4) <Button onClick={resumeGame}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let current;

    	const button = new Button({
    			props: {
    				onClick: /*onStartNewGame*/ ctx[0],
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$paused*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			t = space();
    			if_block.c();
    			attr_dev(div, "class", "actions svelte-1ow2dfg");
    			add_location(div, file$5, 16, 0, 289);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button, div, null);
    			append_dev(div, t);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const button_changes = {};
    			if (dirty & /*onStartNewGame*/ 1) button_changes.onClick = /*onStartNewGame*/ ctx[0];

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(button);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $paused;
    	validate_store(paused, "paused");
    	component_subscribe($$self, paused, $$value => $$invalidate(1, $paused = $$value));
    	let { onStartNewGame } = $$props;
    	const writable_props = ["onStartNewGame"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PuzzleActions> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("PuzzleActions", $$slots, []);

    	$$self.$set = $$props => {
    		if ("onStartNewGame" in $$props) $$invalidate(0, onStartNewGame = $$props.onStartNewGame);
    	};

    	$$self.$capture_state = () => ({
    		pauseGame,
    		resumeGame,
    		Button,
    		paused,
    		onStartNewGame,
    		$paused
    	});

    	$$self.$inject_state = $$props => {
    		if ("onStartNewGame" in $$props) $$invalidate(0, onStartNewGame = $$props.onStartNewGame);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [onStartNewGame, $paused];
    }

    class PuzzleActions extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { onStartNewGame: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PuzzleActions",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onStartNewGame*/ ctx[0] === undefined && !("onStartNewGame" in props)) {
    			console.warn("<PuzzleActions> was created without expected prop 'onStartNewGame'");
    		}
    	}

    	get onStartNewGame() {
    		throw new Error("<PuzzleActions>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onStartNewGame(value) {
    		throw new Error("<PuzzleActions>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TouchHandler.svelte generated by Svelte v3.21.0 */

    function create_fragment$8(ctx) {
    	let dispose;

    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(window, "touchstart", /*handleTouchStart*/ ctx[0], false, false, false),
    				listen_dev(window, "touchend", /*handleTouchEnd*/ ctx[1], false, false, false)
    			];
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const threshold = 50;

    function instance$8($$self, $$props, $$invalidate) {
    	let $emptyCellIndex;
    	validate_store(emptyCellIndex, "emptyCellIndex");
    	component_subscribe($$self, emptyCellIndex, $$value => $$invalidate(6, $emptyCellIndex = $$value));
    	let touchStartX = 0;
    	let touchStartY = 0;
    	let touchEndX = 0;
    	let touchEndY = 0;

    	function handleTouchStart(event) {
    		touchStartX = event.changedTouches[0].screenX;
    		touchStartY = event.changedTouches[0].screenY;
    	}

    	function handleTouchEnd(event) {
    		touchEndX = event.changedTouches[0].screenX;
    		touchEndY = event.changedTouches[0].screenY;
    		const diffX = Math.abs(touchEndX - touchStartX);
    		const diffY = Math.abs(touchEndY - touchStartY);

    		if (diffX > threshold || diffY > threshold) {
    			if (diffX > diffY) {
    				// moving right or left
    				if (touchEndX < touchStartX) {
    					// left
    					handleMove($emptyCellIndex + 1);
    				} else {
    					// right
    					handleMove($emptyCellIndex - 1);
    				}
    			} else {
    				if (touchEndY < touchStartY) {
    					// up
    					handleMove($emptyCellIndex + COLUMNS);
    				} else {
    					// down
    					handleMove($emptyCellIndex - COLUMNS);
    				}
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TouchHandler> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("TouchHandler", $$slots, []);

    	$$self.$capture_state = () => ({
    		handleMove,
    		COLUMNS,
    		emptyCellIndex,
    		touchStartX,
    		touchStartY,
    		touchEndX,
    		touchEndY,
    		threshold,
    		handleTouchStart,
    		handleTouchEnd,
    		$emptyCellIndex
    	});

    	$$self.$inject_state = $$props => {
    		if ("touchStartX" in $$props) touchStartX = $$props.touchStartX;
    		if ("touchStartY" in $$props) touchStartY = $$props.touchStartY;
    		if ("touchEndX" in $$props) touchEndX = $$props.touchEndX;
    		if ("touchEndY" in $$props) touchEndY = $$props.touchEndY;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [handleTouchStart, handleTouchEnd];
    }

    class TouchHandler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TouchHandler",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src/components/PuzzleBoard.svelte generated by Svelte v3.21.0 */
    const file$6 = "src/components/PuzzleBoard.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[8] = i;
    	return child_ctx;
    }

    // (86:2) {#each puzzle as cellValue, index (cellValue)}
    function create_each_block(key_1, ctx) {
    	let div;

    	let t_value = (/*cellValue*/ ctx[6] === EMPTY
    	? ""
    	: /*cellValue*/ ctx[6]) + "";

    	let t;
    	let rect;
    	let stop_animation = noop;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[5](/*index*/ ctx[8], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "svelte-1wm4ib7");
    			toggle_class(div, "cell", /*cellValue*/ ctx[6] !== EMPTY);
    			toggle_class(div, "empty-cell", /*cellValue*/ ctx[6] === EMPTY);
    			toggle_class(div, "no-move", !canMove(/*index*/ ctx[8]));
    			add_location(div, file$6, 86, 4, 1677);
    			this.first = div;
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", click_handler, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*puzzle*/ 16 && t_value !== (t_value = (/*cellValue*/ ctx[6] === EMPTY
    			? ""
    			: /*cellValue*/ ctx[6]) + "")) set_data_dev(t, t_value);

    			if (dirty & /*puzzle, EMPTY*/ 16) {
    				toggle_class(div, "cell", /*cellValue*/ ctx[6] !== EMPTY);
    			}

    			if (dirty & /*puzzle, EMPTY*/ 16) {
    				toggle_class(div, "empty-cell", /*cellValue*/ ctx[6] === EMPTY);
    			}

    			if (dirty & /*canMove, puzzle*/ 16) {
    				toggle_class(div, "no-move", !canMove(/*index*/ ctx[8]));
    			}
    		},
    		r: function measure() {
    			rect = div.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    		},
    		a: function animate() {
    			stop_animation();

    			stop_animation = create_animation(div, rect, flip, {
    				duration: /*flipAnimationDuration*/ ctx[0]
    			});
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(86:2) {#each puzzle as cellValue, index (cellValue)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div3;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let div2;
    	let div0;
    	let t2;
    	let div1;
    	let dispose;
    	let each_value = /*puzzle*/ ctx[4];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*cellValue*/ ctx[6];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Paused";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Click to resume";
    			add_location(div0, file$6, 96, 4, 2001);
    			attr_dev(div1, "class", "hint svelte-1wm4ib7");
    			add_location(div1, file$6, 97, 4, 2023);
    			attr_dev(div2, "class", "paused-text svelte-1wm4ib7");
    			add_location(div2, file$6, 95, 2, 1971);
    			attr_dev(div3, "class", "puzzle svelte-1wm4ib7");
    			toggle_class(div3, "paused", /*paused*/ ctx[3]);
    			add_location(div3, file$6, 84, 0, 1562);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			if (remount) dispose();

    			dispose = listen_dev(
    				div3,
    				"click",
    				function () {
    					if (is_function(/*handleResumeGame*/ ctx[1])) /*handleResumeGame*/ ctx[1].apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*puzzle, EMPTY, canMove, handleMove*/ 20) {
    				const each_value = /*puzzle*/ ctx[4];
    				validate_each_argument(each_value);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div3, fix_and_destroy_block, create_each_block, t0, get_each_context);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    			}

    			if (dirty & /*paused*/ 8) {
    				toggle_class(div3, "paused", /*paused*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { flipAnimationDuration } = $$props;
    	let { handleResumeGame } = $$props;
    	let { handleMove } = $$props;
    	let { paused } = $$props;
    	let { puzzle } = $$props;
    	const writable_props = ["flipAnimationDuration", "handleResumeGame", "handleMove", "paused", "puzzle"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PuzzleBoard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("PuzzleBoard", $$slots, []);
    	const click_handler = index => handleMove(index);

    	$$self.$set = $$props => {
    		if ("flipAnimationDuration" in $$props) $$invalidate(0, flipAnimationDuration = $$props.flipAnimationDuration);
    		if ("handleResumeGame" in $$props) $$invalidate(1, handleResumeGame = $$props.handleResumeGame);
    		if ("handleMove" in $$props) $$invalidate(2, handleMove = $$props.handleMove);
    		if ("paused" in $$props) $$invalidate(3, paused = $$props.paused);
    		if ("puzzle" in $$props) $$invalidate(4, puzzle = $$props.puzzle);
    	};

    	$$self.$capture_state = () => ({
    		canMove,
    		EMPTY,
    		fly,
    		flip,
    		flipAnimationDuration,
    		handleResumeGame,
    		handleMove,
    		paused,
    		puzzle
    	});

    	$$self.$inject_state = $$props => {
    		if ("flipAnimationDuration" in $$props) $$invalidate(0, flipAnimationDuration = $$props.flipAnimationDuration);
    		if ("handleResumeGame" in $$props) $$invalidate(1, handleResumeGame = $$props.handleResumeGame);
    		if ("handleMove" in $$props) $$invalidate(2, handleMove = $$props.handleMove);
    		if ("paused" in $$props) $$invalidate(3, paused = $$props.paused);
    		if ("puzzle" in $$props) $$invalidate(4, puzzle = $$props.puzzle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		flipAnimationDuration,
    		handleResumeGame,
    		handleMove,
    		paused,
    		puzzle,
    		click_handler
    	];
    }

    class PuzzleBoard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			flipAnimationDuration: 0,
    			handleResumeGame: 1,
    			handleMove: 2,
    			paused: 3,
    			puzzle: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PuzzleBoard",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*flipAnimationDuration*/ ctx[0] === undefined && !("flipAnimationDuration" in props)) {
    			console.warn("<PuzzleBoard> was created without expected prop 'flipAnimationDuration'");
    		}

    		if (/*handleResumeGame*/ ctx[1] === undefined && !("handleResumeGame" in props)) {
    			console.warn("<PuzzleBoard> was created without expected prop 'handleResumeGame'");
    		}

    		if (/*handleMove*/ ctx[2] === undefined && !("handleMove" in props)) {
    			console.warn("<PuzzleBoard> was created without expected prop 'handleMove'");
    		}

    		if (/*paused*/ ctx[3] === undefined && !("paused" in props)) {
    			console.warn("<PuzzleBoard> was created without expected prop 'paused'");
    		}

    		if (/*puzzle*/ ctx[4] === undefined && !("puzzle" in props)) {
    			console.warn("<PuzzleBoard> was created without expected prop 'puzzle'");
    		}
    	}

    	get flipAnimationDuration() {
    		throw new Error("<PuzzleBoard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flipAnimationDuration(value) {
    		throw new Error("<PuzzleBoard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleResumeGame() {
    		throw new Error("<PuzzleBoard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleResumeGame(value) {
    		throw new Error("<PuzzleBoard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleMove() {
    		throw new Error("<PuzzleBoard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleMove(value) {
    		throw new Error("<PuzzleBoard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get paused() {
    		throw new Error("<PuzzleBoard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set paused(value) {
    		throw new Error("<PuzzleBoard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get puzzle() {
    		throw new Error("<PuzzleBoard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set puzzle(value) {
    		throw new Error("<PuzzleBoard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Puzzle.svelte generated by Svelte v3.21.0 */
    const file$7 = "src/components/Puzzle.svelte";

    function create_fragment$a(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let span0;
    	let t1;
    	let span1;
    	let t2;
    	let t3;
    	let div1;
    	let span2;
    	let t5;
    	let span3;
    	let t6_value = `${/*$minutesString*/ ctx[3]}:${/*$secondsString*/ ctx[4]}` + "";
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let div3_intro;
    	let current;

    	const puzzleboard = new PuzzleBoard({
    			props: {
    				puzzle: /*$puzzle*/ ctx[5],
    				handleResumeGame: /*handleResumeGame*/ ctx[7],
    				paused: /*$paused*/ ctx[1],
    				flipAnimationDuration: /*flipAnimationDuration*/ ctx[0],
    				handleMove
    			},
    			$$inline: true
    		});

    	const puzzleactions = new PuzzleActions({
    			props: {
    				onStartNewGame: /*handleStartNewGame*/ ctx[6]
    			},
    			$$inline: true
    		});

    	const keyboardhandler = new KeyboardHandler({ $$inline: true });
    	const touchhandler = new TouchHandler({ $$inline: true });
    	const visibilityhandler = new VisibilityHandler({ $$inline: true });

    	const puzzlecomplete = new PuzzleComplete({
    			props: { onNewGame: /*handleStartNewGame*/ ctx[6] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Moves";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(/*$moves*/ ctx[2]);
    			t3 = space();
    			div1 = element("div");
    			span2 = element("span");
    			span2.textContent = "Time";
    			t5 = space();
    			span3 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			create_component(puzzleboard.$$.fragment);
    			t8 = space();
    			create_component(puzzleactions.$$.fragment);
    			t9 = space();
    			create_component(keyboardhandler.$$.fragment);
    			t10 = space();
    			create_component(touchhandler.$$.fragment);
    			t11 = space();
    			create_component(visibilityhandler.$$.fragment);
    			t12 = space();
    			create_component(puzzlecomplete.$$.fragment);
    			attr_dev(span0, "class", "label");
    			add_location(span0, file$7, 58, 6, 1320);
    			add_location(span1, file$7, 59, 6, 1359);
    			attr_dev(div0, "class", "moves");
    			add_location(div0, file$7, 57, 4, 1294);
    			attr_dev(span2, "class", "label");
    			add_location(span2, file$7, 62, 6, 1421);
    			add_location(span3, file$7, 63, 6, 1459);
    			attr_dev(div1, "class", "time svelte-ol7bsm");
    			add_location(div1, file$7, 61, 4, 1396);
    			attr_dev(div2, "class", "game-info svelte-ol7bsm");
    			add_location(div2, file$7, 56, 2, 1266);
    			attr_dev(div3, "class", "puzzle-container svelte-ol7bsm");
    			add_location(div3, file$7, 55, 0, 1187);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(span1, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, span2);
    			append_dev(div1, t5);
    			append_dev(div1, span3);
    			append_dev(span3, t6);
    			append_dev(div3, t7);
    			mount_component(puzzleboard, div3, null);
    			append_dev(div3, t8);
    			mount_component(puzzleactions, div3, null);
    			append_dev(div3, t9);
    			mount_component(keyboardhandler, div3, null);
    			append_dev(div3, t10);
    			mount_component(touchhandler, div3, null);
    			append_dev(div3, t11);
    			mount_component(visibilityhandler, div3, null);
    			append_dev(div3, t12);
    			mount_component(puzzlecomplete, div3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*$moves*/ 4) set_data_dev(t2, /*$moves*/ ctx[2]);
    			if ((!current || dirty & /*$minutesString, $secondsString*/ 24) && t6_value !== (t6_value = `${/*$minutesString*/ ctx[3]}:${/*$secondsString*/ ctx[4]}` + "")) set_data_dev(t6, t6_value);
    			const puzzleboard_changes = {};
    			if (dirty & /*$puzzle*/ 32) puzzleboard_changes.puzzle = /*$puzzle*/ ctx[5];
    			if (dirty & /*$paused*/ 2) puzzleboard_changes.paused = /*$paused*/ ctx[1];
    			if (dirty & /*flipAnimationDuration*/ 1) puzzleboard_changes.flipAnimationDuration = /*flipAnimationDuration*/ ctx[0];
    			puzzleboard.$set(puzzleboard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(puzzleboard.$$.fragment, local);
    			transition_in(puzzleactions.$$.fragment, local);
    			transition_in(keyboardhandler.$$.fragment, local);
    			transition_in(touchhandler.$$.fragment, local);
    			transition_in(visibilityhandler.$$.fragment, local);
    			transition_in(puzzlecomplete.$$.fragment, local);

    			if (!div3_intro) {
    				add_render_callback(() => {
    					div3_intro = create_in_transition(div3, fly, { y: 100, duration: 200, delay: 50 });
    					div3_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(puzzleboard.$$.fragment, local);
    			transition_out(puzzleactions.$$.fragment, local);
    			transition_out(keyboardhandler.$$.fragment, local);
    			transition_out(touchhandler.$$.fragment, local);
    			transition_out(visibilityhandler.$$.fragment, local);
    			transition_out(puzzlecomplete.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(puzzleboard);
    			destroy_component(puzzleactions);
    			destroy_component(keyboardhandler);
    			destroy_component(touchhandler);
    			destroy_component(visibilityhandler);
    			destroy_component(puzzlecomplete);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $paused;
    	let $moves;
    	let $minutesString;
    	let $secondsString;
    	let $puzzle;
    	validate_store(paused, "paused");
    	component_subscribe($$self, paused, $$value => $$invalidate(1, $paused = $$value));
    	validate_store(moves, "moves");
    	component_subscribe($$self, moves, $$value => $$invalidate(2, $moves = $$value));
    	validate_store(minutesString, "minutesString");
    	component_subscribe($$self, minutesString, $$value => $$invalidate(3, $minutesString = $$value));
    	validate_store(secondsString, "secondsString");
    	component_subscribe($$self, secondsString, $$value => $$invalidate(4, $secondsString = $$value));
    	validate_store(puzzle, "puzzle");
    	component_subscribe($$self, puzzle, $$value => $$invalidate(5, $puzzle = $$value));
    	let flipAnimationDuration = 60;

    	function handleStartNewGame() {
    		$$invalidate(0, flipAnimationDuration = 300);
    		startNewGame();

    		setTimeout(
    			() => {
    				$$invalidate(0, flipAnimationDuration = 60);
    			},
    			300
    		);
    	}

    	function handleResumeGame() {
    		if ($paused) {
    			resumeGame();
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Puzzle> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Puzzle", $$slots, []);

    	$$self.$capture_state = () => ({
    		puzzle,
    		moves,
    		minutesString,
    		secondsString,
    		paused,
    		handleMove,
    		resumeGame,
    		startNewGame,
    		VisibilityHandler,
    		KeyboardHandler,
    		PuzzleComplete,
    		PuzzleActions,
    		TouchHandler,
    		PuzzleBoard,
    		fly,
    		flip,
    		flipAnimationDuration,
    		handleStartNewGame,
    		handleResumeGame,
    		$paused,
    		$moves,
    		$minutesString,
    		$secondsString,
    		$puzzle
    	});

    	$$self.$inject_state = $$props => {
    		if ("flipAnimationDuration" in $$props) $$invalidate(0, flipAnimationDuration = $$props.flipAnimationDuration);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		flipAnimationDuration,
    		$paused,
    		$moves,
    		$minutesString,
    		$secondsString,
    		$puzzle,
    		handleStartNewGame,
    		handleResumeGame
    	];
    }

    class Puzzle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Puzzle",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/components/PuzzleHome.svelte generated by Svelte v3.21.0 */
    const file$8 = "src/components/PuzzleHome.svelte";

    // (1:0) <script>   import { startNewGame, initGame }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>   import { startNewGame, initGame }",
    		ctx
    	});

    	return block;
    }

    // (20:2) {:then}
    function create_then_block(ctx) {
    	let current;
    	const puzzle = new Puzzle({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(puzzle.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(puzzle, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(puzzle.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(puzzle.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(puzzle, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(20:2) {:then}",
    		ctx
    	});

    	return block;
    }

    // (18:18)      <Loading />   {:then}
    function create_pending_block(ctx) {
    	let current;
    	const loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loading.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(18:18)      <Loading />   {:then}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div;
    	let promise_1;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "content-wrapper svelte-136mp5e");
    			add_location(div, file$8, 16, 0, 328);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	const promise = initGame();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PuzzleHome> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("PuzzleHome", $$slots, []);

    	$$self.$capture_state = () => ({
    		startNewGame,
    		initGame,
    		Loading,
    		Puzzle,
    		promise
    	});

    	return [promise];
    }

    class PuzzleHome extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PuzzleHome",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    const KEY_PREFIX = "15puzzle:";

    function getItem(key) {
      return window.localStorage.getItem(`${KEY_PREFIX}${key}`);
    }

    function setItem(key, value) {
      window.localStorage.setItem(`${KEY_PREFIX}${key}`, value);
    }

    /* src/components/icons/Moon.svelte generated by Svelte v3.21.0 */

    const file$9 = "src/components/icons/Moon.svelte";

    function create_fragment$c(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			add_location(path0, file$9, 11, 2, 253);
    			attr_dev(path1, "d", "M16.2 4a9.03 9.03 0 1 0 3.9 12a6.5 6.5 0 1 1 -3.9 -12");
    			add_location(path1, file$9, 12, 2, 296);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-moon");
    			attr_dev(svg, "width", "32");
    			attr_dev(svg, "height", "32");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "var(--text-color)");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Moon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Moon", $$slots, []);
    	return [];
    }

    class Moon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Moon",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/components/icons/Sun.svelte generated by Svelte v3.21.0 */

    const file$a = "src/components/icons/Sun.svelte";

    function create_fragment$d(ctx) {
    	let svg;
    	let path0;
    	let circle;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			circle = svg_element("circle");
    			path1 = svg_element("path");
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			add_location(path0, file$a, 11, 2, 252);
    			attr_dev(circle, "cx", "12");
    			attr_dev(circle, "cy", "12");
    			attr_dev(circle, "r", "4");
    			add_location(circle, file$a, 12, 2, 295);
    			attr_dev(path1, "d", "M3 12h1M12 3v1M20 12h1M12 20v1M5.6 5.6l.7 .7M18.4 5.6l-.7 .7M17.7 17.7l.7\n    .7M6.3 17.7l-.7 .7");
    			add_location(path1, file$a, 13, 2, 330);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-sun");
    			attr_dev(svg, "width", "32");
    			attr_dev(svg, "height", "32");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "var(--text-color)");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$a, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, circle);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sun> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Sun", $$slots, []);
    	return [];
    }

    class Sun extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sun",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/components/ThemeSelector.svelte generated by Svelte v3.21.0 */
    const file$b = "src/components/ThemeSelector.svelte";

    // (41:0) {#if theme !== undefined}
    function create_if_block$3(ctx) {
    	let button;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block_1$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*theme*/ ctx[0] === "dark") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if_block.c();
    			attr_dev(button, "class", "btn-toggle-theme svelte-1w9vpu0");
    			attr_dev(button, "title", "Toggle theme");
    			add_location(button, file$b, 41, 2, 836);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if_blocks[current_block_type_index].m(button, null);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*toggleTheme*/ ctx[1], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(button, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if_blocks[current_block_type_index].d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(41:0) {#if theme !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (45:4) {:else}
    function create_else_block$1(ctx) {
    	let current;
    	const moon = new Moon({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(moon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(moon, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(moon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(moon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(moon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(45:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (43:4) {#if theme === 'dark'}
    function create_if_block_1$1(ctx) {
    	let current;
    	const sun = new Sun({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sun.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sun, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sun.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sun.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sun, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(43:4) {#if theme === 'dark'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*theme*/ ctx[0] !== undefined && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*theme*/ ctx[0] !== undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*theme*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const THEME_KEY = "theme";

    function instance$e($$self, $$props, $$invalidate) {
    	let theme = "light";

    	try {
    		theme = getItem(THEME_KEY);
    	} catch(e) {
    		
    	} // ignore

    	function toggleTheme() {
    		const { classList } = document.querySelector("html");
    		classList.remove(theme);
    		$$invalidate(0, theme = theme === "light" ? "dark" : "light");
    		classList.add(theme);

    		try {
    			setItem(THEME_KEY, theme);
    		} catch(e) {
    			
    		} // ignore
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ThemeSelector> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ThemeSelector", $$slots, []);

    	$$self.$capture_state = () => ({
    		getItem,
    		setItem,
    		Moon,
    		Sun,
    		onMount,
    		THEME_KEY,
    		theme,
    		toggleTheme
    	});

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [theme, toggleTheme];
    }

    class ThemeSelector extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ThemeSelector",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/components/Logo.svelte generated by Svelte v3.21.0 */

    const file$c = "src/components/Logo.svelte";

    function create_fragment$f(ctx) {
    	let svg;
    	let g0;
    	let path0;
    	let path1;
    	let g2;
    	let g1;
    	let path2;
    	let g4;
    	let g3;
    	let path3;
    	let g6;
    	let g5;
    	let path4;
    	let g8;
    	let g7;
    	let path5;
    	let g10;
    	let g9;
    	let path6;
    	let g12;
    	let g11;
    	let path7;
    	let g14;
    	let g13;
    	let path8;
    	let g16;
    	let g15;
    	let path9;
    	let g18;
    	let g17;
    	let path10;
    	let g20;
    	let g19;
    	let path11;
    	let g22;
    	let g21;
    	let path12;
    	let g24;
    	let g23;
    	let path13;
    	let g26;
    	let g25;
    	let path14;
    	let g28;
    	let g27;
    	let path15;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			g1 = svg_element("g");
    			path2 = svg_element("path");
    			g4 = svg_element("g");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			path4 = svg_element("path");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			path5 = svg_element("path");
    			g10 = svg_element("g");
    			g9 = svg_element("g");
    			path6 = svg_element("path");
    			g12 = svg_element("g");
    			g11 = svg_element("g");
    			path7 = svg_element("path");
    			g14 = svg_element("g");
    			g13 = svg_element("g");
    			path8 = svg_element("path");
    			g16 = svg_element("g");
    			g15 = svg_element("g");
    			path9 = svg_element("path");
    			g18 = svg_element("g");
    			g17 = svg_element("g");
    			path10 = svg_element("path");
    			g20 = svg_element("g");
    			g19 = svg_element("g");
    			path11 = svg_element("path");
    			g22 = svg_element("g");
    			g21 = svg_element("g");
    			path12 = svg_element("path");
    			g24 = svg_element("g");
    			g23 = svg_element("g");
    			path13 = svg_element("path");
    			g26 = svg_element("g");
    			g25 = svg_element("g");
    			path14 = svg_element("path");
    			g28 = svg_element("g");
    			g27 = svg_element("g");
    			path15 = svg_element("path");
    			attr_dev(path0, "d", "M1.033287025988102 -2.201968528330326 L1069.8865439668298\n      -1.276802159845829 L1072.5923170819879 253.19489588588476\n      L-3.145536206662655 253.91942443698645");
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "stroke-width", "0");
    			attr_dev(path0, "fill", "var(--bg-color)");
    			add_location(path0, file$c, 15, 4, 314);
    			attr_dev(path1, "d", "M0.924289283156395 -1.2320127576589586 C366.0847910997778\n      0.3748044597927944, 729.0858782435477 0.3027130710904018,\n      1071.5265970796347 0.9270060449838639 M0.14260944873094558\n      0.7006996914744378 C234.80751979901981 -0.8799946879011118,\n      470.510950962297 -1.9259855841260873, 1073.1283490136266 0.694611768424511\n      M1074.852941913016 0.7215584655372445 C1075.1487311430208\n      75.61468728962095, 1071.354831719901 154.18101173690616,\n      1073.3521760379185 250.15453309194731 M1072.8309494343177\n      -0.34178922160398173 C1067.5341924880963 78.84143845841598,\n      1067.6378480983658 159.89835615790122, 1072.9643401892083\n      250.61099397445724 M1072.3505647271872 250.76697730123996\n      C646.0178424318001 247.47653712976236, 217.50676015106148\n      247.72563104379435, 0.9857033342123032 252.1833020120859\n      M1072.5014153912664 252.4793830677867 C764.8842242288257\n      255.95601015579817, 455.3853390356234 254.993030123831,\n      -0.6124147459864617 251.8254527375102 M0.8235755472794033\n      254.24061158658122 C1.8404597088239332 189.9052184773888,\n      5.268330647079373 121.35979463622287, 2.2986606207848133\n      1.1388556912359877 M0.31680251275962334 250.97926928228017\n      C-0.8147435958596703 182.74585252702258, -2.2110115080617865\n      114.23873572616027, 0.7212536185824355 0.33280369274820665");
    			attr_dev(path1, "stroke", "var(--text-color)");
    			attr_dev(path1, "stroke-width", "4");
    			attr_dev(path1, "fill", "none");
    			add_location(path1, file$c, 22, 4, 576);
    			attr_dev(g0, "transform", "translate(10 10) rotate(0 536.5546875 126.048828125)");
    			add_location(g0, file$c, 14, 2, 241);
    			attr_dev(path2, "d", "M1.6175062455236908 -2.156022325903177 C2.2234516657888888\n        19.727677003790934, 4.674738704909881 108.70694657986361,\n        4.736150077730417 130.85430837497114 M-0.9489431490004065\n        2.84525460138917 C-0.5761708924671016 25.0938340955476,\n        3.756210510184368 111.8724589846035, 3.9347074066102508\n        133.5351307334006");
    			attr_dev(path2, "stroke", "var(--text-color)");
    			attr_dev(path2, "stroke-width", "4");
    			attr_dev(path2, "fill", "none");
    			add_location(path2, file$c, 52, 6, 2173);
    			attr_dev(g1, "transform", "translate(53.22786458333394 76.43359374999955) rotate(0\n      1.8936034643650146 65.68955420374868)");
    			add_location(g1, file$c, 49, 4, 2045);
    			add_location(g2, file$c, 48, 2, 2037);
    			attr_dev(path3, "d", "M-2.156022325903177 2.646306327730417 C-2.453963621209065\n        12.985712492217619, -2.201256545136372 53.93033576384187,\n        -2.2355353750288485 63.653943232446906 M1.86904134079814\n        1.6145616669952867 C2.5205044504503413 12.280666230072576,\n        2.9538267672558627 57.06357491607467, 3.217946279495955\n        67.22688879922032");
    			attr_dev(path3, "stroke", "var(--text-color)");
    			attr_dev(path3, "stroke-width", "4");
    			attr_dev(path3, "fill", "none");
    			add_location(path3, file$c, 68, 6, 2773);
    			attr_dev(g3, "transform", "translate(90.05208333333394 79.21874999999955) rotate(0\n      0.4575485118687084 34.42072523310782)");
    			add_location(g3, file$c, 65, 4, 2645);
    			add_location(g4, file$c, 64, 2, 2637);
    			attr_dev(path4, "d", "M2.646306327730417 -1.7472541250288485 C9.715530200550953\n        -1.7476787882546583, 35.16080451384187 -3.6283592142164705,\n        44.032849482446906 -2.1585703052580354 C52.904894451051945\n        -0.6887813962996003, 49.389558056741954 3.1755767824749155,\n        55.87857613936067 7.071479328721762 C62.36759422197938\n        10.96738187496861, 78.26947101329763 17.038798515250285,\n        82.96695797815919 21.216844972223043 C87.66444494302074\n        25.394891429195802, 84.61409318819642 28.753094721088804,\n        84.06349792852998 32.13975807055831 C83.51290266886355\n        35.52642142002781, 82.04426605279247 38.45882184530298,\n        79.66338642016053 41.53682506904006 C77.2825067875286 44.61482829277715,\n        74.36468524510661 47.636700916538636, 69.77822013273835\n        50.607777412980795 C65.1917550203701 53.57885390942295,\n        57.12757244482636 57.29648942177494, 52.14459574595094\n        59.363284047693014 C47.16161904707551 61.430078673611085,\n        47.968743081639204 62.56044484799107, 39.880359939485786\n        63.00854516848922 C31.791976797332364 63.45664548898737,\n        9.408648001899321 61.87881947383285, 3.614296893030405 62.05188597068191\n        M0.6383484064042566 3.4759255398809916 C7.178794918308656\n        3.9835120937724913, 31.64361457372705 0.6293748368322851,\n        41.738454345315695 0.4537652339041234 C51.83329411690434\n        0.27815563097596163, 54.44326956455906 -1.2762293778359894,\n        61.207387035936115 2.422267922312021 C67.97150450731317\n        6.120765222460031, 79.05430664564172 17.4929407300055, 82.32315917357802\n        22.644749034792184 C85.59201170151432 27.796557339578868,\n        81.92627497062087 29.319914131710924, 80.82050220355391\n        33.33311775103211 C79.71472943648696 37.3463213703533, 77.14403619314234\n        44.42326667363445, 75.68852257117629 46.72397075071931\n        C74.23300894921024 49.02467482780417, 75.17432696685195\n        45.15891795213024, 72.08742047175765 47.13734221354127\n        C69.00051397666336 49.115766474952295, 62.97276415372888\n        56.49213652188579, 57.167083600610496 58.594516319185495\n        C51.36140304749211 60.6968961164852, 45.87657919908564\n        59.47767010425528, 37.253337153047326 59.75162099733949\n        C28.630095107009016 60.02557189042369, 10.522326464901369\n        59.078573712259534, 5.427631324380636 60.238221677690746");
    			attr_dev(path4, "stroke", "var(--text-color)");
    			attr_dev(path4, "stroke-width", "4");
    			attr_dev(path4, "fill", "none");
    			add_location(path4, file$c, 84, 6, 3373);
    			attr_dev(g5, "transform", "translate(91.15364583333394 142.86718750000045) rotate(0\n      43.089587125349 30.183995556443904)");
    			add_location(g5, file$c, 81, 4, 3246);
    			add_location(g6, file$c, 80, 2, 3238);
    			attr_dev(path5, "d", "M-1.7472541250288485 -0.10386926755309123 C15.885784753412008\n        -1.0918503406147164, 85.49468766078353 -2.837004443258047,\n        103.64221094474196 -3.2815801106393336 M2.4997122792899606\n        -2.628566394299269 C21.2252866153419 -2.184139789392551,\n        91.74199261948466 -1.446009647498528, 109.02720577999949\n        -1.1558873943984507");
    			attr_dev(path5, "stroke", "var(--text-color)");
    			attr_dev(path5, "stroke-width", "4");
    			attr_dev(path5, "fill", "none");
    			add_location(path5, file$c, 130, 6, 6023);
    			attr_dev(g7, "transform", "translate(88.23177083333394 80.56249999999955) rotate(0\n      53.63997582748539 -1.6927246890962238)");
    			add_location(g7, file$c, 127, 4, 5894);
    			add_location(g8, file$c, 126, 2, 5886);
    			attr_dev(path6, "d", "M-0.10386926755309123 -1.8734140552580354 C-0.9154180489480496\n        17.593770687033732, -2.190520068258047 92.28104553247492,\n        -2.2229863606393336 115.05585432872176 C-2.2554526530206203\n        137.83066312496862, -1.0664664867023625 131.04400684858362,\n        -0.2986670218408105 134.77543872222304 M-3.604779654890299\n        3.2812787903845315 C-3.83939651782314 22.09576628421744,\n        1.19004563515385 88.68811492815614, 2.6753656516969206\n        110.92584181204438 C4.160685668239991 133.1635686959326,\n        5.220332441578309 131.80840721820792, 5.307140444368124 136.707640093714");
    			attr_dev(path6, "stroke", "var(--text-color)");
    			attr_dev(path6, "stroke-width", "4");
    			attr_dev(path6, "fill", "none");
    			add_location(path6, file$c, 146, 6, 6633);
    			attr_dev(g9, "transform", "translate(272.72395833333394 80.94531249999955) rotate(0\n      0.8511803947388898 67.41711301922794)");
    			add_location(g9, file$c, 143, 4, 6504);
    			add_location(g10, file$c, 142, 2, 6496);
    			attr_dev(path7, "d", "M-1.8734140552580354 -2.7698613606393336 C-0.7083126462996003\n        -3.2215984863539537, 3.016722615808249 -2.416726903369029,\n        5.243354328721762 -2.8142920218408105 C7.469986041635275\n        -3.211857140312592, 6.178772473583619 -4.308432853470245,\n        11.486376222223043 -5.155252071470022 C16.793979970862466\n        -6.002071289469798, 28.32796451275547 -7.272791238874197,\n        37.08897682055831 -7.895207329839468 C45.849989128361145\n        -8.517623420804739, 56.95361351196965 -8.810444963226717,\n        64.05245006904006 -8.889748617261649 C71.15128662611048\n        -8.969052271296581, 73.88214362487197 -10.992870263506969,\n        79.6819961629808 -8.371029254049063 C85.48184870108962\n        -5.749188244591156, 94.03542171344161 3.1516857899725434,\n        98.85156529769301 6.841297439485788 C103.66770888194442\n        10.530909088999033, 106.81760630632441 11.292111543565989,\n        108.57885766848922 13.766640643030405 C110.34010903065403\n        16.241169742494822, 109.70108509883285 18.9971651352942,\n        109.41907347068191 21.688472036272287 C109.13706184253097\n        24.379778937250375, 110.25720411961278 26.50318282817801,\n        106.88678789958358 29.914482048898936 C103.51637167955438\n        33.32578126961987, 98.03764793897668 38.103271718571584,\n        89.19657615050673 42.15626736059785 C80.35550436203678\n        46.20926300262412, 68.60829383557041 51.08467952782909,\n        53.84035716876387 54.232455901056525 C39.07242050195733\n        57.38023227428396, 9.64113887970646 59.5573102273047, 0.5889561496675015\n        61.04292559996247 M2.3050655297935014 1.8981886620819566\n        C3.4019939307868485 1.733850720276435, 1.4133629191418495\n        0.20735531285405207, 3.8860011081397534 -0.4116027359664436\n        C6.358639297137657 -1.0305607847869394, 11.46476511125763\n        0.21551364218195257, 17.140894663780927 -1.8155596308410171\n        C22.817024216304223 -3.846632903863987, 29.429256140043336\n        -11.704650426357984, 37.94277842327952 -12.598042374104262\n        C46.456300706515705 -13.491434321850539, 60.75877448206146\n        -8.711924327661594, 68.22202836319804 -7.175911317318677\n        C75.68528224433462 -5.639898306975762, 77.35840965554118\n        -5.408637163291375, 82.72230171009898 -3.381964312046766\n        C88.08619376465677 -1.3552914608021576, 96.49806888704498\n        2.2600694651901727, 100.40538069054485 4.9841257901489735\n        C104.31269249404471 7.708182115107775, 104.00599273646871\n        10.586814372887213, 106.16617253109813 12.96237363770604\n        C108.32635232572754 15.337932902524868, 112.88802593037485\n        16.43137783323725, 113.36645945832133 19.237481379061936\n        C113.84489298626781 22.043584924886623, 112.95167986199259\n        25.72840991134445, 109.03677369877695 29.798994912654162\n        C105.12186753556132 33.869579913963875, 99.4275127995511\n        39.736623172312974, 89.87702247902752 43.660991386920216\n        C80.32653215850394 47.58535960152746, 66.6763173862795\n        50.729495806246995, 51.73383177563548 53.345204200297594\n        C36.79134616499146 55.960912594348194, 8.007714390407006\n        57.56378725325068, 0.22210881516337366 59.3552417512238");
    			attr_dev(path7, "stroke", "var(--text-color)");
    			attr_dev(path7, "stroke-width", "4");
    			attr_dev(path7, "fill", "none");
    			add_location(path7, file$c, 165, 6, 7489);
    			attr_dev(g11, "transform", "translate(269.63411458333394 86.2734375) rotate(0\n      55.801153775235434 24.169068150433304)");
    			add_location(g11, file$c, 162, 4, 7366);
    			add_location(g12, file$c, 161, 2, 7358);
    			attr_dev(path8, "d", "M-2.7698613606393336 1.6222605787217619 C17.35457338864605\n        1.727798541635275, 97.4712939299643 -1.6174514847497146,\n        120.64273922815919 -1.2401862777769566 C143.81418452635407\n        -0.8629210708041986, 135.34651506319642 0.6704124294221403,\n        136.25881042852998 3.8858518205583095 C137.17110579386355\n        7.101291211694479, 138.5826775111258 4.909342678636312,\n        126.11651142016053 18.05245006904006 C113.65034532919526\n        31.195557459443805, 80.13682066177329 66.62823737487197,\n        61.461813882738355 82.7444961629808 C42.786807103703424\n        98.86075495108962, -0.6081046385069708 109.24180192177494,\n        14.066470745950937 114.75000279769301 C28.741046130408847\n        120.25820367361109, 127.34048787330589 115.85146047299108,\n        149.5092661894858 115.79370141848922 M0.9219754014909265\n        0.034605368524790237 C21.91833357517918 0.5957626825074359,\n        103.52494705383977 0.005824440866708969, 125.81808781012893\n        1.2112139834463598 C148.1112285664181 2.4166035260260106,\n        135.75205382689833 4.192075084596873, 134.6808199392259\n        7.266942624002695 C133.60958605155346 10.341810163408518,\n        132.04070545062422 6.976010207086803, 119.39068448409438\n        19.660419219881298 C106.74066351756454 32.344828232675795,\n        75.97841982866326 67.928288988024, 58.78069414004683 83.37339670076966\n        C41.5829684514304 98.81850441351533, 2.049980489661296\n        107.45569039876263, 16.204330352395772 112.3310654963553\n        C30.35868021513025 117.20644059394796, 122.29782721226412\n        112.5386913273235, 143.70679331645368 112.62564728632569");
    			attr_dev(path8, "stroke", "var(--text-color)");
    			attr_dev(path8, "stroke-width", "4");
    			attr_dev(path8, "fill", "none");
    			add_location(path8, file$c, 224, 6, 10961);
    			attr_dev(g13, "transform", "translate(514.4817708333339 73.41015625) rotate(0\n      73.36970241442316 58.132349206107904)");
    			add_location(g13, file$c, 221, 4, 10839);
    			add_location(g14, file$c, 220, 2, 10831);
    			attr_dev(path9, "d", "M1.6222605787217619 -2.2596045218408105 C22.05657458330194\n        -1.5725342236459254, 98.28033497358362 0.0027650631964204475,\n        120.73246997222304 1.3525604285299777 C143.18460497086247\n        2.7023557938635347, 136.15283430442216 2.506505636125803,\n        136.33507057055832 5.839167670160532 C136.51730683669447\n        9.171829704195261, 134.6378583036363 8.808044620106617,\n        121.82588756904006 21.34853263273835 C109.0139168344438\n        33.88902064537008, 77.04490404153864 65.1210620281597,\n        59.463246162980795 81.08209574595094 C41.88158828442295\n        97.04312946374218, 1.7307342134416128 111.3320243316392,\n        16.335940297693014 117.11473493948579 C30.941146381944414\n        122.89744554733237, 125.53310109799106 115.75109591856598,\n        147.0944826684892 115.7783593930304 M-0.9416078920662403\n        2.6854420705139637 C20.532849704076845 4.143820701787869,\n        103.33318180685242 5.385587114840747, 125.95652952954173\n        5.211451758891345 C148.57987725223103 5.037316402941943,\n        135.55608922764657 -0.17509539648890504, 134.79847844406962\n        1.6406299348175524 C134.04086766049267 3.45635526612401,\n        134.59441295906902 2.9111503453552725, 121.41086482807994\n        16.10580374673009 C108.22731669709086 29.300457148104904,\n        72.64803418601552 64.16293273881078, 55.69718965813517 80.80855034306646\n        C38.746345130254824 97.45416794732213, 4.218474718381961\n        110.68060497398179, 19.705797660797835 115.97950937226415\n        C35.19312060321371 121.2784137705465, 126.70928761606416\n        112.38384315763909, 148.62112731263042 112.60197673276066");
    			attr_dev(path9, "stroke", "var(--text-color)");
    			attr_dev(path9, "stroke-width", "4");
    			attr_dev(path9, "fill", "none");
    			add_location(path9, file$c, 259, 6, 12860);
    			attr_dev(g15, "transform", "translate(675.8333333333339 73.146484375) rotate(0\n      73.83975971028212 58.55574794049858)");
    			add_location(g15, file$c, 256, 4, 12738);
    			add_location(g16, file$c, 255, 2, 12730);
    			attr_dev(path10, "d", "M-2.2596045218408105 -2.1698737777769566 C-1.6343831819792585\n        18.529006012529134, -16.087729728470247 105.74723534608881,\n        0.9814666785299777 125.81553932055832 C18.0506630855302\n        145.88384329502782, 83.79231292779247 119.28629580363632,\n        100.15557392016053 118.23995006904006 M1.7092288099229336\n        2.823883789926768 C2.25028272335728 22.463589179267487,\n        -17.35533676917354 101.48777355725566, -1.026982695013285\n        121.07582901373506 C15.301371379146971 140.66388447021444,\n        82.75230416322748 120.22322148695588, 99.67935325488448\n        120.35221652880311");
    			attr_dev(path10, "stroke", "var(--text-color)");
    			attr_dev(path10, "stroke-width", "4");
    			attr_dev(path10, "fill", "none");
    			add_location(path10, file$c, 294, 6, 14753);
    			attr_dev(g17, "transform", "translate(853.7903645833339 66.96875) rotate(0\n      46.31053397657388 65.52860983051659)");
    			add_location(g17, file$c, 291, 4, 14635);
    			add_location(g18, file$c, 290, 2, 14627);
    			attr_dev(path11, "d", "M-2.1698737777769566 0.4228729285299777 C-0.9000304458041986\n        23.955611002196864, 7.72900617942214 116.01692230279247,\n        9.24132057055831 138.93682392016052 M1.847670529335737\n        -1.8158784346282482 C2.6428637008368967 21.18563018118342,\n        5.459115298241377 112.75419682616989, 7.274269559830428\n        135.25748507454992");
    			attr_dev(path11, "stroke", "var(--text-color)");
    			attr_dev(path11, "stroke-width", "4");
    			attr_dev(path11, "fill", "none");
    			add_location(path11, file$c, 314, 6, 15609);
    			attr_dev(g19, "transform", "translate(974.1223958333353 62.75) rotate(0 3.535723396390722\n      68.56047274276614)");
    			add_location(g19, file$c, 311, 4, 15494);
    			add_location(g20, file$c, 310, 2, 15486);
    			attr_dev(path12, "d", "M0.4228729285299777 0.49913307055830947 C3.5448037105302013\n        1.0205620450278121, 4.088536886125803 0.10335309530297943,\n        16.47198017016053 0.9587000690400602 C28.85542345419526\n        1.814047042777141, 65.62510191177329 4.751284249871969,\n        74.72353263273835 5.631214912980795 M-2.7920916952192787\n        -1.6982199297845364 C0.383133869419495 -0.6643382098774115,\n        2.815382317155599 1.8991543346146746, 15.565300620645285\n        3.590165418535471 C28.31521892413497 5.281176502456267,\n        64.56005805994073 7.566179107576608, 73.70741812571883 8.447846573740243");
    			attr_dev(path12, "stroke", "var(--text-color)");
    			attr_dev(path12, "stroke-width", "4");
    			attr_dev(path12, "fill", "none");
    			add_location(path12, file$c, 330, 6, 16204);
    			attr_dev(g21, "transform", "translate(982.7044270833353 61.76171875) rotate(0\n      35.9657204687594 3.3748133219778538)");
    			add_location(g21, file$c, 327, 4, 16083);
    			add_location(g22, file$c, 326, 2, 16075);
    			attr_dev(path13, "d", "M0.49913307055830947 2.452448920160532 C6.7581922533611465\n        2.624954704195261, 29.35400413696965 2.233825870106618,\n        35.38448131904006 1.457907632738352 M-2.6744331903755665\n        1.315467381030321 C4.681602978358666 0.6240610595047472,\n        34.57937628393372 -2.493934693783522, 40.78860596463084\n        -2.761325054615736");
    			attr_dev(path13, "stroke", "var(--text-color)");
    			attr_dev(path13, "stroke-width", "4");
    			attr_dev(path13, "fill", "none");
    			add_location(path13, file$c, 349, 6, 17055);
    			attr_dev(g23, "transform", "translate(984.3098958333353 135.30859375) rotate(0\n      19.057086387127583 -0.13578902824525585)");
    			add_location(g23, file$c, 346, 4, 16929);
    			add_location(g24, file$c, 345, 2, 16921);
    			attr_dev(path14, "d", "M2.452448920160532 -1.8381749309599398 C15.162064079195261\n        -2.0101717072228587, 64.55609149510661 -0.4349136667946974,\n        76.68056388273835 -0.5328475870192051 C88.8050362703701\n        -0.6307815072437127, 74.6737964031597 -2.1019480782250564,\n        75.19928324595094 -2.425778452306986 M0.33925412043929093\n        3.335647725015879 C12.76948141440749 3.5520163223644103,\n        61.81790183886885 3.238856746902069, 75.23399049147963 2.802982963472605\n        C88.65007914409041 2.367109180043141, 81.19210262641312\n        1.1644212537507217, 80.83578603610397 0.7204050244390965");
    			attr_dev(path14, "stroke", "var(--text-color)");
    			attr_dev(path14, "stroke-width", "4");
    			attr_dev(path14, "fill", "none");
    			add_location(path14, file$c, 365, 6, 17656);
    			attr_dev(g25, "transform", "translate(983.0481770833353 198.99609375000045) rotate(0\n      41.76939717516302 0.48970078104974846)");
    			add_location(g25, file$c, 362, 4, 17526);
    			add_location(g26, file$c, 361, 2, 17518);
    			attr_dev(path15, "d", "M-1.8381749309599398 1.457907632738352 C1.1800771353697508\n        23.59069888611083, 9.987540036909111 112.03577556982638,\n        18.60864546853645 135.2491964403954 C27.229750900163793\n        158.46261731096442, 41.48398942177494 141.45904979460215,\n        49.8884576588041 140.73843285615243 C58.29292589583326\n        140.0178159177027, 63.58757158410212 135.6030924463437,\n        69.03545489071139 130.92549480969703 C74.48333819732066\n        126.24789717305033, 78.73942421920324 119.94790298251641,\n        82.57575749845974 112.67284703627229 C86.41209077771623\n        105.39779109002816, 90.5137868742425 105.46173317540021,\n        92.05345456625032 87.27515913223225 C93.59312225825815\n        69.08858508906428, 91.93160048527298 18.34075725097895,\n        91.81376365050673 3.553402777264478 C91.69592681574048\n        -11.233951696449996, 92.08015436797784 -0.6598227869857332,\n        91.34643355765279 -1.4489677100545864 M2.359434464424849\n        -0.21896774813532804 C4.910576144859764 23.415052645200934,\n        8.450881358258258 114.8913650810222, 16.077135315123634\n        137.68258105021386 C23.70338927198901 160.4737970194055,\n        39.191951021800435 137.2201112919328, 48.11695820561711\n        136.52832806701457 C57.041965389433784 135.83654484209634,\n        63.14710923266074 137.2182593526608, 69.62717841802368\n        133.53188170070445 C76.10724760338661 129.8455040487481,\n        82.64782571740174 122.36995585608813, 86.99737331779471\n        114.41006215527653 C91.34692091818768 106.45016845446494,\n        94.68138038777099 103.47489137657813, 95.72446402038145\n        85.77251949583489 C96.76754765299191 68.07014761509164,\n        94.18446287773826 22.847970608864628, 93.25587511345744\n        8.195830870817067 C92.32728734917661 -6.456308867230494,\n        90.49615286756999 -0.07624897454072821, 90.15293743469651\n        -2.140318932450483");
    			attr_dev(path15, "stroke", "var(--text-color)");
    			attr_dev(path15, "stroke-width", "4");
    			attr_dev(path15, "fill", "none");
    			add_location(path15, file$c, 384, 6, 18509);
    			attr_dev(g27, "transform", "translate(396.47786458333394 75.47569444444434) rotate(0\n      47.05962219169737 71.6233203243466)");
    			add_location(g27, file$c, 381, 4, 18382);
    			add_location(g28, file$c, 380, 2, 18374);
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 1093.109375 272.09765625");
    			attr_dev(svg, "class", "logo svelte-1nhuikx");
    			add_location(svg, file$c, 7, 0, 90);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g0);
    			append_dev(g0, path0);
    			append_dev(g0, path1);
    			append_dev(svg, g2);
    			append_dev(g2, g1);
    			append_dev(g1, path2);
    			append_dev(svg, g4);
    			append_dev(g4, g3);
    			append_dev(g3, path3);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, path4);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, path5);
    			append_dev(svg, g10);
    			append_dev(g10, g9);
    			append_dev(g9, path6);
    			append_dev(svg, g12);
    			append_dev(g12, g11);
    			append_dev(g11, path7);
    			append_dev(svg, g14);
    			append_dev(g14, g13);
    			append_dev(g13, path8);
    			append_dev(svg, g16);
    			append_dev(g16, g15);
    			append_dev(g15, path9);
    			append_dev(svg, g18);
    			append_dev(g18, g17);
    			append_dev(g17, path10);
    			append_dev(svg, g20);
    			append_dev(g20, g19);
    			append_dev(g19, path11);
    			append_dev(svg, g22);
    			append_dev(g22, g21);
    			append_dev(g21, path12);
    			append_dev(svg, g24);
    			append_dev(g24, g23);
    			append_dev(g23, path13);
    			append_dev(svg, g26);
    			append_dev(g26, g25);
    			append_dev(g25, path14);
    			append_dev(svg, g28);
    			append_dev(g28, g27);
    			append_dev(g27, path15);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Logo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Logo", $$slots, []);
    	return [];
    }

    class Logo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logo",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.21.0 */
    const file$d = "src/components/Header.svelte";

    function create_fragment$g(ctx) {
    	let header;
    	let div0;
    	let t;
    	let div1;
    	let current;
    	const themeselector = new ThemeSelector({ $$inline: true });
    	const logo = new Logo({ $$inline: true });

    	const block = {
    		c: function create() {
    			header = element("header");
    			div0 = element("div");
    			create_component(themeselector.$$.fragment);
    			t = space();
    			div1 = element("div");
    			create_component(logo.$$.fragment);
    			attr_dev(div0, "class", "theme-selector-wrapper svelte-1lbo0a7");
    			add_location(div0, file$d, 26, 2, 489);
    			attr_dev(div1, "class", "logo-wrapper svelte-1lbo0a7");
    			add_location(div1, file$d, 29, 2, 559);
    			attr_dev(header, "class", "svelte-1lbo0a7");
    			add_location(header, file$d, 25, 0, 478);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div0);
    			mount_component(themeselector, div0, null);
    			append_dev(header, t);
    			append_dev(header, div1);
    			mount_component(logo, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(themeselector.$$.fragment, local);
    			transition_in(logo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(themeselector.$$.fragment, local);
    			transition_out(logo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			destroy_component(themeselector);
    			destroy_component(logo);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Header", $$slots, []);
    	$$self.$capture_state = () => ({ ThemeSelector, Logo });
    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.21.0 */

    const file$e = "src/components/Footer.svelte";

    function create_fragment$h(ctx) {
    	let footer;
    	let div;
    	let t0;
    	let a0;
    	let t2;
    	let span;
    	let t4;
    	let a1;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div = element("div");
    			t0 = text("Built by\n    ");
    			a0 = element("a");
    			a0.textContent = "Sriram";
    			t2 = space();
    			span = element("span");
    			span.textContent = "|";
    			t4 = space();
    			a1 = element("a");
    			a1.textContent = "Buy me a coffee?";
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noopener");
    			attr_dev(a0, "href", "https://twitter.com/tsriram");
    			attr_dev(a0, "class", "svelte-kdae72");
    			add_location(a0, file$e, 20, 4, 232);
    			add_location(span, file$e, 23, 4, 328);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener");
    			attr_dev(a1, "href", "https://www.buymeacoffee.com/tsriram");
    			attr_dev(a1, "class", "svelte-kdae72");
    			add_location(a1, file$e, 24, 4, 347);
    			attr_dev(div, "class", "svelte-kdae72");
    			add_location(div, file$e, 18, 2, 209);
    			attr_dev(footer, "class", "svelte-kdae72");
    			add_location(footer, file$e, 17, 0, 198);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div);
    			append_dev(div, t0);
    			append_dev(div, a0);
    			append_dev(div, t2);
    			append_dev(div, span);
    			append_dev(div, t4);
    			append_dev(div, a1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Footer", $$slots, []);
    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/components/App.svelte generated by Svelte v3.21.0 */
    const file$f = "src/components/App.svelte";

    // (26:0) {#if isProd}
    function create_if_block$4(ctx) {
    	let t;
    	let current;
    	const serviceworker = new ServiceWorker({ $$inline: true });
    	const googleanalytics = new GoogleAnalytics({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(serviceworker.$$.fragment);
    			t = space();
    			create_component(googleanalytics.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(serviceworker, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(googleanalytics, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(serviceworker.$$.fragment, local);
    			transition_in(googleanalytics.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(serviceworker.$$.fragment, local);
    			transition_out(googleanalytics.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(serviceworker, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(googleanalytics, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(26:0) {#if isProd}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let t2;
    	let if_block_anchor;
    	let current;
    	const header = new Header({ $$inline: true });
    	const puzzlehome = new PuzzleHome({ $$inline: true });
    	const footer = new Footer({ $$inline: true });
    	let if_block = /*isProd*/ ctx[0] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(puzzlehome.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			t2 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(main, "class", "container svelte-prszkm");
    			add_location(main, file$f, 20, 0, 471);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t0);
    			mount_component(puzzlehome, main, null);
    			append_dev(main, t1);
    			mount_component(footer, main, null);
    			insert_dev(target, t2, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(puzzlehome.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(puzzlehome.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(puzzlehome);
    			destroy_component(footer);
    			if (detaching) detach_dev(t2);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	const isProd = {"env":{"isProd":false}}.env.isProd;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		GoogleAnalytics,
    		ServiceWorker,
    		PuzzleHome,
    		Header,
    		Footer,
    		isProd
    	});

    	return [isProd];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.[hash].js.map
