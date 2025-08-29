import java.util.List;
import java.util.ArrayList;

/**
 * 用户管理系统
 * 
 * ```mermaid
 * ---
 * title: 用户管理
 * ---
 * classDiagram
 * class UserManager {
 * -List~User~ users
 * +addUser(User user): boolean
 * +removeUser(int userId): boolean
 * +findUser(int userId): User
 * +getAllUsers(): List~User~
 * }
 *
 * class User {
 * -int id
 * -String name
 * -String email
 * +getId(): int
 * +getName(): String
 * +getEmail(): String
 * }
 *
 * UserManager --> User
 * ```
 */
public class UserManager {
    private List<User> users;

    public UserManager() {
        this.users = new ArrayList<>();
    }

    /**
     * 添加用户流程
     * 
     * ```mermaid
     * ---
     * title: 添加用户
     * ---
     * sequenceDiagram
     * participant C as 客户端
     * participant UM as UserManager
     * participant V as 验证器
     * participant DB as 数据存储
     *
     * C->>UM: addUser(user)
     * UM->>V: validateUser(user)
     * alt 验证成功
     * V-->>UM: 验证通过
     * UM->>DB: saveUser(user)
     * DB-->>UM: 保存成功
     * UM-->>C: 返回true
     * else 验证失败
     * V-->>UM: 验证失败
     * UM-->>C: 返回false
     * end
     * ```
     */
    public boolean addUser(User user) {
        if (user != null && user.getName() != null) {
            users.add(user);
            return true;
        }
        return false;
    }

    /**
     * 用户查找算法
     * 
     * ```mermaid
     * graph TD
     *     A[开始查找] --> B[遍历用户列表]
     *     B --> C{找到匹配ID?}
     *     C -->|是| D[返回用户对象]
     *     C -->|否| E[继续下一个]
     *     E --> F{列表结束?}
     *     F -->|否| B
     *     F -->|是| G[返回null]
     * ```
     */
    public User findUser(int userId) {
        for (User user : users) {
            if (user.getId() == userId) {
                return user;
            }
        }
        return null;
    }

    /**
     * 用户删除流程
     * 
     * ```mermaid
     * flowchart LR
     *     A[接收删除请求] --> B[查找用户]
     *     B --> C{用户存在?}
     *     C -->|是| D[从列表移除]
     *     C -->|否| E[返回false]
     *     D --> F[返回true]
     * ```
     * 
     * ```mermaid
     * flowchart LR
     *     A[接收删除请求] --> B[查找用户]
     *     B --> C{用户存在?}
     *     C -->|是| D[从列表移除]
     *     C -->|否| E[返回false]
     *     D --> F[返回true]
     * ```
     */
    public boolean removeUser(int userId) {
        return users.removeIf(user -> user.getId() == userId);
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users);
    }
}

/**
 * 用户实体类
 */
class User {
    private int id;
    private String name;
    private String email;

    /**
     * 用户初始化流程
     * 
     * ```mermaid
     * graph LR
     *     A[创建User对象] --> B[设置ID]
     *     B --> C[设置姓名]
     *     C --> D[设置邮箱]
     *     D --> E[初始化完成]
     * ```
     */
    public User(int id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}