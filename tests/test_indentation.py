def test_indentation_and_folding():
    """
    测试缩进和折叠功能
    
    ```mermaid
    graph TD
        A[开始] --> B[处理数据]
        B --> C{数据有效?}
        C -->|是| D[继续处理]
        C -->|否| E[错误处理]
        D --> F[完成]
        E --> F
        F --> G[结束]
        
        style A fill:#e1f5fe
        style G fill:#c8e6c9
        style E fill:#ffcdd2
    ```
    """
    pass


def complex_nested_structure():
    """
    复杂嵌套结构测试
    
    ```mermaid
    graph TD
        A[主流程] --> B[子流程1]
        A --> C[子流程2]
        B --> D[子流程1.1]
        B --> E[子流程1.2]
        C --> F[子流程2.1]
        C --> G[子流程2.2]
        D --> H[结果1]
        E --> H
        F --> I[结果2]
        G --> I
        H --> J[最终结果]
        I --> J
        
        subgraph "子流程1组"
            B
            D
            E
        end
        
        subgraph "子流程2组"
            C
            F
            G
        end
    ```
    """
    pass


def sequence_with_notes():
    """
    带注释的时序图
    
    ```mermaid
    sequenceDiagram
        participant U as 用户
        participant F as 前端
        participant B as 后端
        participant D as 数据库
        
        Note over U,D: 用户登录流程
        
        U->>F: 输入用户名密码
        F->>B: 发送登录请求
        B->>D: 查询用户信息
        D-->>B: 返回用户数据
        
        alt 验证成功
            B-->>F: 返回成功响应
            F-->>U: 显示成功页面
        else 验证失败
            B-->>F: 返回错误信息
            F-->>U: 显示错误提示
        end
        
        Note over U,D: 流程结束
    ```
    """
    pass


def class_hierarchy():
    """
    类层次结构
    
    ```mermaid
    classDiagram
        class Animal {
            <<abstract>>
            +String name
            +int age
            +makeSound()*
        }
        
        class Mammal {
            +boolean hasFur
            +giveBirth()
        }
        
        class Bird {
            +boolean canFly
            +layEggs()
        }
        
        class Dog {
            +String breed
            +bark()
        }
        
        class Cat {
            +String color
            +meow()
        }
        
        Animal <|-- Mammal
        Animal <|-- Bird
        Mammal <|-- Dog
        Mammal <|-- Cat
    ```
    """
    pass 