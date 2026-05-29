import React from 'react';
import { toAbsoluteMediaUrl } from '../utils/media';

const MediaImg = ({ src, alt, className, style, ...props }) => {
  return (
    <img
      src={toAbsoluteMediaUrl(src)}
      alt={alt || ''}
      className={className}
      style={style}
      {...props}
    />
  );
};

export default MediaImg;
