import { set, useFormValue, type StringInputProps } from 'sanity';
import { normalizeSizeValue, SIZE_VALUE_PATTERN } from './sizeValue';

// Cleans the size value when the field loses focus. If what was typed has no
// number + unit, it is filled from the English label of the same size.
export function SizeValueInput(props: StringInputProps) {
  const { elementProps, onChange, value, path } = props;
  const labelEn = useFormValue([...path.slice(0, -1), 'label_en']) as string | undefined;

  return props.renderDefault({
    ...props,
    elementProps: {
      ...elementProps,
      onBlur: (event) => {
        let clean = normalizeSizeValue(value || '');
        if (!SIZE_VALUE_PATTERN.test(clean) && labelEn) clean = normalizeSizeValue(labelEn);
        if (clean && clean !== value) onChange(set(clean));
        elementProps.onBlur(event);
      },
    },
  });
}
