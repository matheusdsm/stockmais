import { createGlobalStyle } from 'styled-components';

export const theme = {
  colors: {
    primary: '#0052CC',
    primaryHover: '#0747A6',
    neutral: '#42526E',
    neutralLight: '#6B778C',
    success: '#36B37E',
    warning: '#FFAB00',
    danger: '#FF5630',
    background: '#F4F5F7',
    surface: '#FFFFFF',
    border: '#DFE1E6',
    text: '#172B4D',
    textSecondary: '#6B778C'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  borderRadius: '3px',
  fontSize: {
    body: '14px',
    heading: '24px',
    small: '12px'
  }
};

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Charlie Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: ${theme.fontSize.body};
    color: ${theme.colors.text};
    background-color: ${theme.colors.background};
  }
  
  a {
    color: ${theme.colors.primary};
    text-decoration: none;
  }
  
  button {
    cursor: pointer;
    font-family: inherit;
  }
  
  input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }
`;
