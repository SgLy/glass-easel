use std::fmt::{Result as FmtResult, Write as FmtWrite};

use super::{Stringifier, Stringify};
use crate::{
    escape::gen_lit_str,
    parse::expr::{ArrayFieldKind, Expression, ObjectFieldKind},
};

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Eq, Ord)]
pub(crate) enum ExpressionLevel {
    Lit = 0,
    Member = 1,
    Unary = 2,
    Multiply = 3,
    Plus = 4,
    Comparison = 5,
    Eq = 6,
    BitAnd = 7,
    BitXor = 8,
    BitOr = 9,
    LogicAnd = 10,
    LogicOr = 11,
    Cond = 12,
}

impl ExpressionLevel {
    pub(crate) fn from_expression(expr: &Expression) -> Self {
        match expr {
            Expression::ScopeRef { .. } => ExpressionLevel::Lit,
            Expression::DataField { .. } => ExpressionLevel::Lit,
            Expression::ToStringWithoutUndefined { .. } => ExpressionLevel::Member,
            Expression::LitUndefined { .. } => ExpressionLevel::Lit,
            Expression::LitNull { .. } => ExpressionLevel::Lit,
            Expression::LitStr { .. } => ExpressionLevel::Lit,
            Expression::LitInt { .. } => ExpressionLevel::Lit,
            Expression::LitFloat { .. } => ExpressionLevel::Lit,
            Expression::LitBool { .. } => ExpressionLevel::Lit,
            Expression::LitObj { .. } => ExpressionLevel::Lit,
            Expression::LitArr { .. } => ExpressionLevel::Lit,
            Expression::StaticMember { .. } => ExpressionLevel::Member,
            Expression::DynamicMember { .. } => ExpressionLevel::Member,
            Expression::FuncCall { .. } => ExpressionLevel::Member,
            Expression::Reverse { .. } => ExpressionLevel::Unary,
            Expression::BitReverse { .. } => ExpressionLevel::Unary,
            Expression::Positive { .. } => ExpressionLevel::Unary,
            Expression::Negative { .. } => ExpressionLevel::Unary,
            Expression::TypeOf { .. } => ExpressionLevel::Unary,
            Expression::Void { .. } => ExpressionLevel::Unary,
            Expression::Multiply { .. } => ExpressionLevel::Multiply,
            Expression::Divide { .. } => ExpressionLevel::Multiply,
            Expression::Remainer { .. } => ExpressionLevel::Multiply,
            Expression::Plus { .. } => ExpressionLevel::Plus,
            Expression::Minus { .. } => ExpressionLevel::Plus,
            Expression::Lt { .. } => ExpressionLevel::Comparison,
            Expression::Gt { .. } => ExpressionLevel::Comparison,
            Expression::Lte { .. } => ExpressionLevel::Comparison,
            Expression::Gte { .. } => ExpressionLevel::Comparison,
            Expression::InstanceOf { .. } => ExpressionLevel::Comparison,
            Expression::Eq { .. } => ExpressionLevel::Eq,
            Expression::Ne { .. } => ExpressionLevel::Eq,
            Expression::EqFull { .. } => ExpressionLevel::Eq,
            Expression::NeFull { .. } => ExpressionLevel::Eq,
            Expression::BitAnd { .. } => ExpressionLevel::BitAnd,
            Expression::BitXor { .. } => ExpressionLevel::BitXor,
            Expression::BitOr { .. } => ExpressionLevel::BitOr,
            Expression::LogicAnd { .. } => ExpressionLevel::LogicAnd,
            Expression::LogicOr { .. } => ExpressionLevel::LogicOr,
            Expression::NullishCoalescing { .. } => ExpressionLevel::LogicOr,
            Expression::Cond { .. } => ExpressionLevel::Cond,
        }
    }
}

fn expression_strigify_write<'s, W: FmtWrite>(
    expression: &Expression,
    stringifier: &mut Stringifier<'s, W>,
    accept_level: ExpressionLevel,
) -> FmtResult {
    let cur_level = ExpressionLevel::from_expression(expression);
    if cur_level > accept_level {
        stringifier.write_str("(")?;
        expression_strigify_write(expression, stringifier, ExpressionLevel::Cond)?;
        stringifier.write_str(")")?;
        return Ok(());
    }
    match expression {
        Expression::ScopeRef { location, index } => {
            stringifier.write_scope_name(*index, location)?;
        }
        Expression::DataField { name, location } => {
            stringifier.write_token(name, name, location)?;
        }
        Expression::ToStringWithoutUndefined { .. } => {
            panic!("illegal expression");
        }

        Expression::LitUndefined { location } => {
            stringifier.write_token("undefined", "undefined", location)?;
        }
        Expression::LitNull { location } => {
            stringifier.write_token("null", "null", location)?;
        }
        Expression::LitStr { value, location } => {
            let quoted = gen_lit_str(&value);
            stringifier.write_token(&format!(r#"{}"#, quoted), &value, &location)?;
        }
        Expression::LitInt { value, location } => {
            let value = value.to_string();
            stringifier.write_token(&value, &value, location)?;
        }
        Expression::LitFloat { value, location } => {
            let value = value.to_string();
            stringifier.write_token(&value, &value, location)?;
        }
        Expression::LitBool { value, location } => {
            let value = if *value { "true" } else { "false" };
            stringifier.write_token(value, value, location)?;
        }
        Expression::LitObj {
            fields,
            brace_location,
        } => {
            stringifier.write_token("{", "{", &brace_location.0)?;
            for (index, field) in fields.iter().enumerate() {
                if index > 0 {
                    stringifier.write_str(",")?;
                }
                match field {
                    ObjectFieldKind::Named {
                        name,
                        location,
                        colon_location,
                        value,
                    } => {
                        let is_shortcut = match value {
                            Expression::ScopeRef { index, .. } => {
                                stringifier.get_scope_name(*index) == name.as_str()
                            }
                            Expression::DataField { name: x, .. } => x == name,
                            _ => false,
                        };
                        stringifier.write_token(name, name, location)?;
                        if !is_shortcut {
                            stringifier.write_token(
                                ":",
                                ":",
                                colon_location.as_ref().unwrap_or(location),
                            )?;
                            expression_strigify_write(value, stringifier, ExpressionLevel::Cond)?;
                        }
                    }
                    ObjectFieldKind::Spread { location, value } => {
                        stringifier.write_token("...", "...", location)?;
                        expression_strigify_write(value, stringifier, ExpressionLevel::Cond)?;
                    }
                }
            }
            stringifier.write_token("}", "}", &brace_location.1)?;
        }
        Expression::LitArr {
            fields,
            bracket_location,
        } => {
            stringifier.write_token("[", "[", &bracket_location.0)?;
            for (index, field) in fields.iter().enumerate() {
                if index > 0 {
                    stringifier.write_str(",")?;
                }
                match field {
                    ArrayFieldKind::Normal { value } => {
                        expression_strigify_write(value, stringifier, ExpressionLevel::Cond)?;
                    }
                    ArrayFieldKind::Spread { location, value } => {
                        stringifier.write_token("...", "...", location)?;
                        expression_strigify_write(value, stringifier, ExpressionLevel::Cond)?;
                    }
                    ArrayFieldKind::EmptySlot => {
                        if index == fields.len() - 1 {
                            stringifier.write_str(",")?;
                        }
                    }
                }
            }
            stringifier.write_token("]", "]", &bracket_location.1)?;
        }

        Expression::StaticMember {
            obj,
            field_name,
            dot_location,
            field_location,
        } => {
            expression_strigify_write(obj, stringifier, ExpressionLevel::Member)?;
            stringifier.write_token(".", ".", dot_location)?;
            stringifier.write_token(&field_name, &field_name, field_location)?;
        }
        Expression::DynamicMember {
            obj,
            field_name,
            bracket_location,
        } => {
            expression_strigify_write(obj, stringifier, ExpressionLevel::Member)?;
            stringifier.write_token("[", "[", &bracket_location.0)?;
            expression_strigify_write(&field_name, stringifier, ExpressionLevel::Cond)?;
            stringifier.write_token("]", "]", &bracket_location.1)?;
        }
        Expression::FuncCall {
            func,
            args,
            paren_location,
        } => {
            expression_strigify_write(func, stringifier, ExpressionLevel::Member)?;
            stringifier.write_token("(", "(", &paren_location.0)?;
            for (index, arg) in args.iter().enumerate() {
                if index > 0 {
                    stringifier.write_str(",")?;
                }
                expression_strigify_write(&arg, stringifier, ExpressionLevel::Cond)?;
            }
            stringifier.write_token(")", ")", &paren_location.1)?;
        }

        Expression::Reverse { value, location } => {
            stringifier.write_token("!", "!", location)?;
            expression_strigify_write(&value, stringifier, ExpressionLevel::Unary)?;
        }
        Expression::BitReverse { value, location } => {
            stringifier.write_token("~", "~", location)?;
            expression_strigify_write(&value, stringifier, ExpressionLevel::Unary)?;
        }
        Expression::Positive { value, location } => {
            stringifier.write_token(" +", " +", location)?;
            expression_strigify_write(&value, stringifier, ExpressionLevel::Unary)?;
        }
        Expression::Negative { value, location } => {
            stringifier.write_token(" -", " -", location)?;
            expression_strigify_write(&value, stringifier, ExpressionLevel::Unary)?;
        }
        Expression::TypeOf { value, location } => {
            stringifier.write_token(" typeof ", " typeof ", location)?;
            expression_strigify_write(&value, stringifier, ExpressionLevel::Unary)?;
        }
        Expression::Void { value, location } => {
            stringifier.write_token(" void ", " void ", location)?;
            expression_strigify_write(&value, stringifier, ExpressionLevel::Unary)?;
        }

        Expression::Multiply {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Multiply)?;
            stringifier.write_token("*", "*", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Unary)?;
        }
        Expression::Divide {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Multiply)?;
            stringifier.write_token("/", "/", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Unary)?;
        }
        Expression::Remainer {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Multiply)?;
            stringifier.write_token("%", "%", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Unary)?;
        }

        Expression::Plus {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Plus)?;
            stringifier.write_token("+", "+", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Multiply)?;
        }
        Expression::Minus {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Plus)?;
            stringifier.write_token("-", "-", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Multiply)?;
        }

        Expression::Lt {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Comparison)?;
            stringifier.write_token("<", "<", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Plus)?;
        }
        Expression::Lte {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Comparison)?;
            stringifier.write_token("<=", "<=", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Plus)?;
        }
        Expression::Gt {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Comparison)?;
            stringifier.write_token(">", ">", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Plus)?;
        }
        Expression::Gte {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Comparison)?;
            stringifier.write_token(">=", ">=", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Plus)?;
        }
        Expression::InstanceOf {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Comparison)?;
            stringifier.write_token(" instanceof ", " instanceof ", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Plus)?;
        }

        Expression::Eq {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Eq)?;
            stringifier.write_token("==", "==", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Comparison)?;
        }
        Expression::Ne {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Eq)?;
            stringifier.write_token("!=", "!=", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Comparison)?;
        }
        Expression::EqFull {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Eq)?;
            stringifier.write_token("===", "===", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Comparison)?;
        }
        Expression::NeFull {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::Eq)?;
            stringifier.write_token("!==", "!==", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Comparison)?;
        }

        Expression::BitAnd {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::BitAnd)?;
            stringifier.write_token("&", "&", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::Eq)?;
        }

        Expression::BitXor {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::BitXor)?;
            stringifier.write_token("^", "^", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::BitAnd)?;
        }

        Expression::BitOr {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::BitOr)?;
            stringifier.write_token("|", "|", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::BitXor)?;
        }

        Expression::LogicAnd {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::LogicAnd)?;
            stringifier.write_token("&&", "&&", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::BitOr)?;
        }

        Expression::LogicOr {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::LogicOr)?;
            stringifier.write_token("||", "||", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::LogicAnd)?;
        }
        Expression::NullishCoalescing {
            left,
            right,
            location,
        } => {
            expression_strigify_write(&left, stringifier, ExpressionLevel::LogicOr)?;
            stringifier.write_token("??", "??", location)?;
            expression_strigify_write(&right, stringifier, ExpressionLevel::LogicAnd)?;
        }

        Expression::Cond {
            cond,
            true_br,
            false_br,
            question_location,
            colon_location,
        } => {
            expression_strigify_write(&cond, stringifier, ExpressionLevel::LogicOr)?;
            stringifier.write_token("?", "?", question_location)?;
            expression_strigify_write(&true_br, stringifier, ExpressionLevel::Cond)?;
            stringifier.write_token(":", ":", colon_location)?;
            expression_strigify_write(&false_br, stringifier, ExpressionLevel::Cond)?;
        }
    }
    Ok(())
}

impl Stringify for Expression {
    fn stringify_write<'s, W: FmtWrite>(&self, stringifier: &mut Stringifier<'s, W>) -> FmtResult {
        expression_strigify_write(self, stringifier, ExpressionLevel::Cond)
    }
}
