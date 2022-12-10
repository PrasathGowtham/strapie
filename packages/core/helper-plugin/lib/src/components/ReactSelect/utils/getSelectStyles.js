const getSelectStyles = (theme, error) => {
  return {
    clearIndicator: (base) => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    container: (base) => ({
      ...base,
      background: theme.colors.neutral0,
      lineHeight: 'normal',
    }),
    control(base, state) {
      let borderColor = theme.colors.neutral200;
      let boxShadowColor;
      let backgroundColor;

      if (state.isFocused) {
        borderColor = theme.colors.primary600;
        boxShadowColor = theme.colors.primary600;
      } else if (error) {
        borderColor = theme.colors.danger600;
      }

      if (state.isDisabled) {
        backgroundColor = `${theme.colors.neutral150} !important`;
      }

      return {
        ...base,
        fontSize: theme.fontSizes[2],
        height: 40,
        border: `1px solid ${borderColor} !important`,
        outline: 0,
        backgroundColor,
        borderRadius: theme.borderRadius,
        boxShadow: boxShadowColor ? `${boxShadowColor} 0px 0px 0px 2px` : 0,
      };
    },
    indicatorContainer: (base) => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    input: (base) => ({ ...base, margin: 0, padding: 0, color: theme.colors.neutral800 }),
    menu(base) {
      return {
        ...base,
        width: '100%',
        marginTop: theme.spaces[1],
        backgroundColor: theme.colors.neutral0,
        color: theme.colors.neutral800,
        borderRadius: theme.borderRadius,
        border: `1px solid ${theme.colors.neutral200}`,
        boxShadow: theme.shadows.tableShadow,
        fontSize: theme.fontSizes[2],
        zIndex: 2,
      };
    },
    menuList: (base) => ({
      ...base,
      paddingLeft: theme.spaces[1],
      paddingTop: theme.spaces[1],
      paddingRight: theme.spaces[1],
      paddingBottom: theme.spaces[1],
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 100,
    }),
    option(base, state) {
      let backgroundColor = base.backgroundColor;

      if (state.isFocused || state.isSelected) {
        backgroundColor = theme.colors.primary100;
      }

      return {
        ...base,
        lineHeight: theme.spaces[5],
        backgroundColor,
        borderRadius: theme.borderRadius,
        '&:active': {
          backgroundColor: theme.colors.primary100,
        },
      };
    },
    placeholder: (base) => ({
      ...base,
      color: theme.colors.neutral600,
      marginLeft: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '80%',
    }),
    singleValue(base, state) {
      let color = theme.colors.neutral800;

      if (state.isDisabled) {
        color = theme.colors.neutral600;
      }

      return { ...base, marginLeft: 0, color };
    },
    valueContainer: (base) => ({
      ...base,
      padding: 0,
      paddingLeft: theme.spaces[4],
      marginLeft: 0,
      marginRight: 0,
    }),
  };
};

export default getSelectStyles;
