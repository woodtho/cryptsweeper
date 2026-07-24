import { Children, cloneElement, Fragment, isValidElement } from 'react';
import { mechanicTextParts } from './mechanics.js';

const INTERACTIVE = new Set(['button','a','input','textarea','select','option','kbd']);

function enrich(child, path = 'term') {
  if (typeof child === 'string' || typeof child === 'number') {
    return mechanicTextParts(child).map((part,index) => part.key
      ? <span className="mechanic-term" data-mechanic={part.key} tabIndex="0" key={`${path}-${index}`}>{part.text}</span>
      : <Fragment key={`${path}-${index}`}>{part.text}</Fragment>);
  }
  if (!isValidElement(child)) return child;
  if (typeof child.type === 'string' && (INTERACTIVE.has(child.type) || child.props['data-mechanic'] || String(child.props.className || '').includes('mechanic-term') || child.props.dangerouslySetInnerHTML)) return child;
  if (child.props.children == null) return child;
  return cloneElement(child, undefined, Children.map(child.props.children, (nested,index) => enrich(nested, `${path}-${index}`)));
}

export function MechanicTerms({ children }) {
  return <>{Children.map(children, (child,index) => enrich(child, `root-${index}`))}</>;
}
